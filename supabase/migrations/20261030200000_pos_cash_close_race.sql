-- POS cash close-out follow-up (goal tlb-pos-followups). Two non-blocking
-- review items from the tlb-pos stack, redefined in place with CREATE OR
-- REPLACE; no table, index, grant or policy changes.
--
-- 1. pos_cash_requires_open_drawer ran with search_path = public. Every other
--    SECURITY DEFINER function in the POS stack pins search_path = ''; the
--    body is already fully schema-qualified, so this only aligns it.
--
-- 2. Close-vs-payment race. pos_close_drawer locks the open session row
--    FOR UPDATE and then sums pos cash payments in [opened_at, now()). A cash
--    payment whose trigger had already seen the drawer open, but which had not
--    committed yet, was invisible to that sum and landed after the close: it
--    was counted in no session at all. Two changes close the window:
--    - the trigger takes FOR SHARE on the open session row, which conflicts
--      with the close's FOR UPDATE. A payment that got there first makes the
--      close wait until it commits; a payment that arrives during a close waits
--      for it, re-reads the row as closed and is refused NO_OPEN_DRAWER.
--    - the close's upper bound (and closed_at) is clock_timestamp() taken
--      after the lock, not now(). now() is the close transaction's start,
--      which can be earlier than the created_at of a payment that committed
--      while the close was waiting on its lock.
CREATE OR REPLACE FUNCTION public.pos_cash_requires_open_drawer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.channel = 'pos' AND NEW.method = 'cash'
     AND NOT EXISTS (
       SELECT 1 FROM public.pos_cash_sessions WHERE status = 'open' FOR SHARE
     ) THEN
    RAISE EXCEPTION 'NO_OPEN_DRAWER: open the cash drawer before taking a cash payment at the counter';
  END IF;
  RETURN NEW;
END;
$$;

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
  v_close_at   timestamptz;
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

  -- Taken after the FOR UPDATE above, so every payment that passed the
  -- open-drawer trigger before this close has committed and is inside the
  -- window (see the header).
  v_close_at := clock_timestamp();

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
    AND created_at < v_close_at;
  v_cash_sales := round(v_cash_sales, 2);
  v_expected := round(v_session.opening_float + v_cash_sales, 2);
  v_variance := round(p_counted_cash - v_expected, 2);

  IF v_variance <> 0 AND COALESCE(btrim(p_note), '') = '' THEN
    RAISE EXCEPTION 'VARIANCE_NOTE_REQUIRED: a note is required when counted cash does not match expected cash';
  END IF;

  UPDATE public.pos_cash_sessions
  SET status        = 'closed',
      closed_by     = v_uid,
      closed_at     = v_close_at,
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

