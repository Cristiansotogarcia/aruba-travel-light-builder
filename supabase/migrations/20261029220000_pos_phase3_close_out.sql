-- POS Phase 3 (cash close-out). Contract: PLANS/TLB_POS_PHASE3_CONTRACT.md
-- (Buzz Nest, goal tlb-pos). Adds cash drawer open/close with float and an
-- end-of-day report by method and staff, per-staff audit. One store, one
-- drawer: a partial unique index guarantees at most one open session.
--
-- Additive only: no existing migration is edited, no existing RPC's
-- definition changes. RLS on pos_cash_sessions is SELECT-only for staff;
-- all writes go through the SECURITY DEFINER RPCs below, same pattern as
-- pos_cash_sessions's siblings (booking_payments, credit_notes).
--
-- Deviation from the contract's RPC list (noted for Elby/Cristian): the
-- contract lists three RPCs (pos_open_drawer, pos_close_drawer,
-- pos_end_of_day_report). A fourth, pos_drawer_cash_so_far(), is added below.
-- Reason: the UI contract's Drawer tab must show "cash sales so far / expected"
-- live while a drawer is open, computed from booking_payments with the same
-- rule pos_close_drawer uses. booking_payments' own SELECT RLS policy
-- (20260704110000_create_booking_payments.sql) is Admin/SuperUser/Accounting/
-- Booker only — it does NOT include StoreStaff, and phase 1 deliberately left
-- that RLS "unchanged otherwise" — so StoreStaff (one of this contract's own
-- pos_open_drawer/pos_close_drawer roles) cannot read booking_payments
-- directly from the client. This is the exact same gap phase 2 hit for
-- get_pos_today_board ("No RPC today gives StoreStaff a view... so this is a
-- new, narrow RPC"); pos_drawer_cash_so_far follows that precedent rather
-- than widening booking_payments' RLS (out of scope here) or leaving
-- StoreStaff unable to see the live figure the contract's own UI section asks
-- for.

-- ---------------------------------------------------------------------------
-- 1. pos_cash_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE public.pos_cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_by uuid NOT NULL REFERENCES public.profiles(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_float numeric(10,2) NOT NULL CHECK (opening_float >= 0),
  open_note text,
  closed_by uuid REFERENCES public.profiles(id),
  closed_at timestamptz,
  cash_sales numeric(10,2),
  expected_cash numeric(10,2),
  counted_cash numeric(10,2) CHECK (counted_cash >= 0),
  variance numeric(10,2),
  close_note text
);

-- One store, one drawer: at most one row may be status = 'open'. Every row
-- satisfying the predicate has the same indexed value ('open'), so the index
-- allows exactly one of them to exist at a time; this is also the race guard
-- pos_open_drawer relies on (see its unique_violation handler below).
CREATE UNIQUE INDEX idx_pos_cash_sessions_single_open
  ON public.pos_cash_sessions (status)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_opened_at
  ON public.pos_cash_sessions (opened_at);

ALTER TABLE public.pos_cash_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PosCashSessions: staff can read" ON public.pos_cash_sessions;
CREATE POLICY "PosCashSessions: staff can read" ON public.pos_cash_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('Admin', 'SuperUser', 'Accounting', 'Booker', 'StoreStaff')
  )
);
-- No INSERT/UPDATE/DELETE policies: writes happen only through the
-- SECURITY DEFINER RPCs below.

GRANT SELECT ON public.pos_cash_sessions TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. pos_open_drawer(p_opening_float, p_note)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_open_drawer(
  p_opening_float numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_role       public.app_role;
  v_session_id uuid;
  v_opened_at  timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: pos_open_drawer requires Admin, SuperUser, Booker or StoreStaff';
  END IF;

  IF p_opening_float IS NULL OR p_opening_float < 0 THEN
    RAISE EXCEPTION 'INVALID_FLOAT: opening float must be zero or more';
  END IF;

  -- Friendly pre-check; the unique index below is the authoritative race
  -- guard for two concurrent opens.
  IF EXISTS (SELECT 1 FROM public.pos_cash_sessions WHERE status = 'open') THEN
    RAISE EXCEPTION 'DRAWER_ALREADY_OPEN: a drawer is already open';
  END IF;

  BEGIN
    INSERT INTO public.pos_cash_sessions (opened_by, opening_float, open_note)
    VALUES (v_uid, round(p_opening_float, 2), NULLIF(btrim(p_note), ''))
    RETURNING id, opened_at INTO v_session_id, v_opened_at;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'DRAWER_ALREADY_OPEN: a drawer is already open';
  END;

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'opened_at', v_opened_at,
    'opening_float', round(p_opening_float, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pos_open_drawer(numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pos_open_drawer(numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.pos_open_drawer(numeric, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. pos_close_drawer(p_session_id, p_counted_cash, p_note)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_close_drawer(
  p_session_id uuid,
  p_counted_cash numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_role       public.app_role;
  v_session    public.pos_cash_sessions%ROWTYPE;
  v_cash_sales numeric;
  v_expected   numeric;
  v_variance   numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: pos_close_drawer requires Admin, SuperUser, Booker or StoreStaff';
  END IF;

  SELECT * INTO v_session FROM public.pos_cash_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drawer session % not found', p_session_id;
  END IF;

  IF v_session.status <> 'open' THEN
    RAISE EXCEPTION 'DRAWER_NOT_OPEN: session % is %', p_session_id, v_session.status;
  END IF;

  IF p_counted_cash IS NULL OR p_counted_cash < 0 THEN
    RAISE EXCEPTION 'INVALID_COUNTED_CASH: counted cash must be zero or more';
  END IF;

  -- cash_sales: pos-channel cash payments recorded since this session opened.
  -- Card, other and office-channel payments never count (contract #3).
  SELECT COALESCE(SUM(amount), 0)
  INTO v_cash_sales
  FROM public.booking_payments
  WHERE method = 'cash'
    AND channel = 'pos'
    AND created_at >= v_session.opened_at
    AND created_at < now();
  v_cash_sales := round(v_cash_sales, 2);
  v_expected := round(v_session.opening_float + v_cash_sales, 2);
  v_variance := round(p_counted_cash - v_expected, 2);

  IF v_variance <> 0 AND COALESCE(btrim(p_note), '') = '' THEN
    RAISE EXCEPTION 'VARIANCE_NOTE_REQUIRED: a note is required when counted cash does not match expected cash';
  END IF;

  UPDATE public.pos_cash_sessions
  SET status        = 'closed',
      closed_by     = v_uid,
      closed_at     = now(),
      cash_sales    = v_cash_sales,
      expected_cash = v_expected,
      counted_cash  = round(p_counted_cash, 2),
      variance      = v_variance,
      close_note    = NULLIF(btrim(p_note), '')
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN to_jsonb(v_session);
END;
$$;

REVOKE ALL ON FUNCTION public.pos_close_drawer(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pos_close_drawer(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.pos_close_drawer(uuid, numeric, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. pos_drawer_cash_so_far() — see the header deviation note. Mirrors
--    pos_close_drawer's cash_sales/expected_cash computation exactly, but
--    read-only (no row lock, no update) and self-locating (looks up the one
--    open session rather than taking a session id), so the Drawer tab can
--    poll it while staying usable to StoreStaff.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_drawer_cash_so_far()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_role       public.app_role;
  v_session    public.pos_cash_sessions%ROWTYPE;
  v_cash_sales numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: pos_drawer_cash_so_far requires Admin, SuperUser, Booker or StoreStaff';
  END IF;

  SELECT * INTO v_session FROM public.pos_cash_sessions WHERE status = 'open' LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_cash_sales
  FROM public.booking_payments
  WHERE method = 'cash'
    AND channel = 'pos'
    AND created_at >= v_session.opened_at
    AND created_at < now();
  v_cash_sales := round(v_cash_sales, 2);

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'cash_sales', v_cash_sales,
    'expected_cash', round(v_session.opening_float + v_cash_sales, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pos_drawer_cash_so_far() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pos_drawer_cash_so_far() FROM anon;
GRANT EXECUTE ON FUNCTION public.pos_drawer_cash_so_far() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. pos_end_of_day_report(p_date)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_end_of_day_report(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_role   public.app_role;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('Admin', 'SuperUser', 'Accounting', 'Booker', 'StoreStaff') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: pos_end_of_day_report requires Admin, SuperUser, Accounting, Booker or StoreStaff';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'INVALID_DATE: a date is required';
  END IF;

  -- The day is the Aruba local day (UTC-4, no DST): created_at AT TIME ZONE
  -- 'America/Aruba' converts the timestamptz to Aruba wall-clock time, whose
  -- date part is compared to p_date.
  WITH day_payments AS (
    SELECT bp.id, bp.amount, bp.method, bp.recorded_by
    FROM public.booking_payments bp
    WHERE bp.channel = 'pos'
      AND (bp.created_at AT TIME ZONE 'America/Aruba')::date = p_date
  ),
  day_credit_notes AS (
    SELECT cn.id, cn.amount, cn.created_by
    FROM public.credit_notes cn
    WHERE (cn.created_at AT TIME ZONE 'America/Aruba')::date = p_date
  ),
  day_extensions AS (
    SELECT bal.id, bal.user_id
    FROM public.booking_audit_log bal
    WHERE bal.action = 'RENTAL_EXTENDED'
      AND (bal.created_at AT TIME ZONE 'America/Aruba')::date = p_date
  ),
  staff_ids AS (
    SELECT recorded_by AS staff_id FROM day_payments WHERE recorded_by IS NOT NULL
    UNION
    SELECT created_by FROM day_credit_notes WHERE created_by IS NOT NULL
    UNION
    SELECT user_id FROM day_extensions WHERE user_id IS NOT NULL
  ),
  by_method_agg AS (
    SELECT method, COUNT(*) AS count, round(SUM(amount), 2) AS total
    FROM day_payments
    GROUP BY method
  ),
  by_staff_agg AS (
    SELECT
      s.staff_id,
      COALESCE(pr.name, 'Unknown') AS staff_name,
      COUNT(dp.id) AS sales_count,
      round(COALESCE(SUM(dp.amount) FILTER (WHERE dp.method = 'cash'), 0), 2) AS cash,
      round(COALESCE(SUM(dp.amount) FILTER (WHERE dp.method = 'card'), 0), 2) AS card,
      round(COALESCE(SUM(dp.amount) FILTER (WHERE dp.method NOT IN ('cash', 'card')), 0), 2) AS other,
      (SELECT COUNT(*) FROM day_credit_notes dc WHERE dc.created_by = s.staff_id) AS credit_notes_count,
      round(COALESCE((SELECT SUM(dc.amount) FROM day_credit_notes dc WHERE dc.created_by = s.staff_id), 0), 2)
        AS credit_notes_total,
      (SELECT COUNT(*) FROM day_extensions de WHERE de.user_id = s.staff_id) AS extensions_count
    FROM staff_ids s
    LEFT JOIN public.profiles pr ON pr.id = s.staff_id
    LEFT JOIN day_payments dp ON dp.recorded_by = s.staff_id
    GROUP BY s.staff_id, pr.name
  )
  SELECT jsonb_build_object(
    'date', p_date,
    'by_method', (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('method', method, 'count', count, 'total', total) ORDER BY method),
        '[]'::jsonb
      )
      FROM by_method_agg
    ),
    'by_staff', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'staff_id', staff_id,
            'staff_name', staff_name,
            'sales_count', sales_count,
            'cash', cash,
            'card', card,
            'other', other,
            'credit_notes_count', credit_notes_count,
            'credit_notes_total', credit_notes_total,
            'extensions_count', extensions_count
          ) ORDER BY staff_name
        ),
        '[]'::jsonb
      )
      FROM by_staff_agg
    ),
    'sessions', (
      SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.opened_at), '[]'::jsonb)
      FROM public.pos_cash_sessions s
      WHERE (s.opened_at AT TIME ZONE 'America/Aruba')::date = p_date
    ),
    'totals', jsonb_build_object(
      'payments', round((SELECT COALESCE(SUM(amount), 0) FROM day_payments), 2),
      'credit_notes', round((SELECT COALESCE(SUM(amount), 0) FROM day_credit_notes), 2)
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.pos_end_of_day_report(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pos_end_of_day_report(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.pos_end_of_day_report(date) TO authenticated;
