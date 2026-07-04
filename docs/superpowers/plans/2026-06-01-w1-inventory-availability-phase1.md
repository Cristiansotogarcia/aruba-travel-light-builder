# W1 Inventory & Availability — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make booking creation date-aware and race-safe so the same unit can never be double-booked, with reservations that hold stock on request and auto-expire — with no customer-facing UI change yet.

**Architecture:** Availability is computed on-the-fly from `bookings`/`booking_items` (no materialized ledger). A single `SECURITY DEFINER` Postgres RPC `create_booking_with_items` locks the equipment rows, re-checks availability, and inserts atomically. Holds carry a `hold_expires_at`; a `pg_cron` job flips expired holds to a new `expired` status. The exact availability math also lives in a pure TS module so it is unit-testable and reusable by the Phase 2 UI.

**Tech Stack:** Supabase Postgres (plpgsql, `SECURITY DEFINER set search_path = ''`, `pg_cron`), `supabase-js` v2 `.rpc()`, TypeScript, Vitest.

**Spec:** [docs/superpowers/specs/2026-06-01-w1-inventory-availability-design.md](../specs/2026-06-01-w1-inventory-availability-design.md)

**Scope note:** This is **Phase 1** of W1 (DB foundation + oversell protection). **Phase 2** (dates-first browsing UI: `useRentalDates`, `useAvailability`, catalog/detail/cart) is a separate plan written after this ships.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/availability/availabilityMath.ts` (create) | Pure availability semantics: committed-status predicate + peak-concurrency calc. Single source of truth mirrored by SQL. |
| `src/lib/availability/availabilityMath.test.ts` (create) | Vitest unit tests for the math. |
| `supabase/migrations/20260601000000_w1_inventory_availability.sql` (create) | Schema: `hold_expires_at`, category buffer, settings seed, indexes, drop legacy availability trigger, zero `reserved_quantity`. |
| `supabase/migrations/20260601000001_w1_availability_functions.sql` (create) | RPCs: `equipment_available_units`, `get_equipment_availability`, `check_booking_availability`, `create_booking_with_items`. |
| `supabase/migrations/20260601000002_w1_hold_expiry.sql` (create) | `expire_holds()`, backfill, `pg_cron` schedule, patched `upsert_booking_service_tasks` guard. |
| `src/types/types.ts:55` (modify) | Add `'expired'` to the booking status union. |
| `src/components/admin/calendar/types.ts` (modify) | Add `'expired'` to `BookingStatus`. |
| `src/lib/queries/booking-create.ts` (create) | `buildCreateBookingArgs()` + `parseAvailabilityConflict()` pure helpers + `createBookingWithItems()` rpc wrapper. |
| `src/lib/queries/booking-create.test.ts` (create) | Vitest tests for the helpers + mocked rpc. |
| `src/hooks/useBooking.ts:344-393` (modify) | Replace direct inserts with the rpc wrapper; surface conflict errors. |

---

## Task 1: Availability math (pure TS)

**Files:**
- Create: `src/lib/availability/availabilityMath.ts`
- Test: `src/lib/availability/availabilityMath.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/availability/availabilityMath.test.ts
import { describe, expect, it } from 'vitest';
import { computeAvailableUnits, consumesInventory, type CommittingBooking } from './availabilityMath';

const NOW = new Date('2026-06-10T12:00:00.000Z');
const b = (over: Partial<CommittingBooking>): CommittingBooking => ({
  id: 'x', status: 'confirmed', start_date: '2026-06-12', end_date: '2026-06-15',
  hold_expires_at: null, quantity: 1, ...over,
});

describe('consumesInventory', () => {
  it('counts active committed statuses', () => {
    expect(consumesInventory({ status: 'confirmed' }, NOW)).toBe(true);
    expect(consumesInventory({ status: 'delivered' }, NOW)).toBe(true);
  });
  it('ignores released statuses', () => {
    for (const s of ['completed', 'cancelled', 'rejected', 'undeliverable', 'expired']) {
      expect(consumesInventory({ status: s }, NOW)).toBe(false);
    }
  });
  it('counts a live hold but not an expired one', () => {
    expect(consumesInventory({ status: 'pending_admin_review', hold_expires_at: '2026-06-11T00:00:00.000Z' }, NOW)).toBe(true);
    expect(consumesInventory({ status: 'pending_admin_review', hold_expires_at: '2026-06-10T00:00:00.000Z' }, NOW)).toBe(false);
  });
});

describe('computeAvailableUnits', () => {
  const base = { stock: 3, bufferDays: 0, reqStart: '2026-06-12', reqEnd: '2026-06-15', now: NOW };

  it('returns full stock when nothing is committed', () => {
    expect(computeAvailableUnits({ ...base, committed: [] })).toBe(3);
  });
  it('subtracts overlapping committed quantity', () => {
    expect(computeAvailableUnits({ ...base, committed: [b({ quantity: 2 })] })).toBe(1);
  });
  it('ignores non-overlapping bookings', () => {
    expect(computeAvailableUnits({ ...base, committed: [b({ start_date: '2026-07-01', end_date: '2026-07-05', quantity: 2 })] })).toBe(3);
  });
  it('uses the peak day, not the sum across the window', () => {
    const committed = [
      b({ start_date: '2026-06-12', end_date: '2026-06-13', quantity: 2 }),
      b({ start_date: '2026-06-14', end_date: '2026-06-15', quantity: 2 }),
    ];
    expect(computeAvailableUnits({ ...base, committed })).toBe(1); // peak is 2 on any single day
  });
  it('extends occupancy by the turnaround buffer', () => {
    const committed = [b({ start_date: '2026-06-09', end_date: '2026-06-11', quantity: 3 })]; // ends day before reqStart
    expect(computeAvailableUnits({ ...base, bufferDays: 1, committed })).toBe(0); // buffer day (06-12) collides
    expect(computeAvailableUnits({ ...base, bufferDays: 0, committed })).toBe(3);
  });
  it('excludes the booking being edited', () => {
    expect(computeAvailableUnits({ ...base, committed: [b({ id: 'self', quantity: 3 })], excludeBookingId: 'self' })).toBe(3);
  });
  it('never returns below zero', () => {
    expect(computeAvailableUnits({ ...base, committed: [b({ quantity: 10 })] })).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/availability/availabilityMath.test.ts`
Expected: FAIL — `Cannot find module './availabilityMath'`.

- [ ] **Step 3: Implement the module**

```ts
// src/lib/availability/availabilityMath.ts

// Booking statuses that consume inventory while active.
export const COMMITTED_STATUSES = [
  'pending', 'pending_admin_review', 'confirmed', 'out_for_delivery', 'in_transit', 'delivered',
] as const;

// Pending-style statuses only hold while their hold_expires_at is in the future.
const PENDING_STATUSES = new Set(['pending', 'pending_admin_review']);

export interface CommittingBooking {
  id: string;
  status: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string;   // 'YYYY-MM-DD'
  hold_expires_at?: string | null;
  quantity: number;   // quantity of the equipment in question
}

const MS_PER_DAY = 86_400_000;

// Parse a 'YYYY-MM-DD' date as a UTC midnight epoch to avoid timezone drift.
function dayEpoch(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function consumesInventory(
  booking: { status: string; hold_expires_at?: string | null },
  now: Date,
): boolean {
  if (!COMMITTED_STATUSES.includes(booking.status as (typeof COMMITTED_STATUSES)[number])) return false;
  if (PENDING_STATUSES.has(booking.status)) {
    if (!booking.hold_expires_at) return true; // safety: treat as held if no expiry recorded
    return now.getTime() < new Date(booking.hold_expires_at).getTime();
  }
  return true;
}

export interface AvailabilityParams {
  stock: number;
  bufferDays: number;
  reqStart: string; // 'YYYY-MM-DD'
  reqEnd: string;   // 'YYYY-MM-DD'
  committed: CommittingBooking[];
  now?: Date;
  excludeBookingId?: string;
}

// available = stock - peak committed quantity over the requested occupancy window [reqStart, reqEnd + buffer].
export function computeAvailableUnits(params: AvailabilityParams): number {
  const now = params.now ?? new Date();
  const windowStart = dayEpoch(params.reqStart);
  const windowEnd = dayEpoch(params.reqEnd) + params.bufferDays * MS_PER_DAY;

  const active = params.committed.filter(
    (cb) => cb.id !== params.excludeBookingId && consumesInventory(cb, now),
  );

  let peak = 0;
  for (let day = windowStart; day <= windowEnd; day += MS_PER_DAY) {
    let onDay = 0;
    for (const cb of active) {
      const occStart = dayEpoch(cb.start_date);
      const occEnd = dayEpoch(cb.end_date) + params.bufferDays * MS_PER_DAY;
      if (day >= occStart && day <= occEnd) onDay += cb.quantity;
    }
    if (onDay > peak) peak = onDay;
  }

  return Math.max(0, params.stock - peak);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/availability/availabilityMath.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/availability/availabilityMath.ts src/lib/availability/availabilityMath.test.ts
git commit -m "feat(availability): add pure date-aware availability math + tests"
```

---

## Task 2: Schema migration + status union

**Files:**
- Create: `supabase/migrations/20260601000000_w1_inventory_availability.sql`
- Modify: `src/types/types.ts:55`, `src/components/admin/calendar/types.ts`

- [ ] **Step 1: Pre-flight check for a status CHECK constraint**

Run: `npx supabase db diff --schema public 2>/dev/null` is not reliable offline; instead grep the schema for a constraint that would reject the new value.

Run: `grep -rin "status" supabase/migrations/20240618120000_init_tables.sql`
Expected: confirm whether `bookings.status` has a `CHECK (... IN (...))`. If it does, the migration below must `ALTER TABLE public.bookings DROP CONSTRAINT <name>` and re-add it including `'expired'`. If `status` is plain `text`/`varchar` with no CHECK (expected here), no constraint work is needed.

- [ ] **Step 2: Write the schema migration**

```sql
-- supabase/migrations/20260601000000_w1_inventory_availability.sql
-- W1 Phase 1: date-aware availability foundation.

-- 1. Hold expiry on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_hold_expires_at
  ON public.bookings(hold_expires_at)
  WHERE status IN ('pending', 'pending_admin_review');

CREATE INDEX IF NOT EXISTS idx_bookings_status_dates
  ON public.bookings(status, start_date, end_date);

-- 2. Optional per-category turnaround buffer (NULL = use global default)
ALTER TABLE public.equipment_category
  ADD COLUMN IF NOT EXISTS turnaround_buffer_days INTEGER;

-- 3. Settings: hold window + global buffer (idempotent seed)
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_active)
VALUES
  ('hold_window_hours', '48', 'number', 'Hours an unconfirmed reservation holds stock before auto-expiry', TRUE),
  ('turnaround_buffer_days', '0', 'number', 'Default days a unit is unavailable after a rental ends', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

-- 4. Repurpose availability_status as a manual override: stop deriving it from the global counter
DROP TRIGGER IF EXISTS trigger_update_equipment_availability ON public.stock_movements;
DROP FUNCTION IF EXISTS public.update_equipment_availability();

-- 5. Retire the global reserved counter from availability decisions (kept for back-compat, zeroed)
UPDATE public.equipment SET reserved_quantity = 0 WHERE COALESCE(reserved_quantity, 0) <> 0;
```

- [ ] **Step 3: Add `'expired'` to the TypeScript status unions**

In `src/types/types.ts` line 55, add `| 'expired'`:

```ts
  status: 'pending' | 'pending_admin_review' | 'confirmed' | 'cancelled' | 'completed' | 'out_for_delivery' | 'in_transit' | 'delivered' | 'undeliverable' | 'rejected' | 'expired';
```

In `src/components/admin/calendar/types.ts`, add `'expired'` to the `BookingStatus` union (match the existing members, append `| 'expired'`).

- [ ] **Step 4: Apply the migration locally and verify**

Run: `npx supabase migration up`
Expected: migration applies cleanly. Verify columns:
Run (Supabase SQL editor or psql): `select column_name from information_schema.columns where table_name='bookings' and column_name='hold_expires_at';`
Expected: one row.

- [ ] **Step 5: Verify the app still type-checks**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no new errors from the union change.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260601000000_w1_inventory_availability.sql src/types/types.ts src/components/admin/calendar/types.ts
git commit -m "feat(db): W1 availability schema (hold expiry, buffer, settings) + expired status"
```

---

## Task 3: Availability read functions

**Files:**
- Create: `supabase/migrations/20260601000001_w1_availability_functions.sql` (this task adds the first two functions; Tasks 4–5 append to the same file)

- [ ] **Step 1: Write `equipment_available_units` and `get_equipment_availability`**

```sql
-- supabase/migrations/20260601000001_w1_availability_functions.sql
-- W1 Phase 1: availability RPCs. Mirrors src/lib/availability/availabilityMath.ts.

-- Available units of one equipment for a requested window, honoring the turnaround buffer
-- and live holds. p_exclude_booking_id lets an edit ignore its own booking.
CREATE OR REPLACE FUNCTION public.equipment_available_units(
  p_equipment_id uuid,
  p_start date,
  p_end date,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH cfg AS (
    SELECT
      COALESCE(
        (SELECT ec.turnaround_buffer_days
           FROM public.equipment e
           LEFT JOIN public.equipment_category ec ON ec.id = e.category_id
          WHERE e.id = p_equipment_id),
        (SELECT setting_value::int FROM public.system_settings
          WHERE setting_key = 'turnaround_buffer_days' AND is_active),
        0
      ) AS buffer_days,
      (SELECT stock_quantity FROM public.equipment WHERE id = p_equipment_id) AS stock
  ),
  days AS (
    SELECT gs::date AS day
    FROM cfg,
    LATERAL generate_series(p_start, (p_end + (cfg.buffer_days || ' days')::interval)::date, interval '1 day') gs
  ),
  committed AS (
    SELECT b.start_date, b.end_date, bi.quantity
    FROM public.bookings b
    JOIN public.booking_items bi ON bi.booking_id = b.id
    WHERE bi.equipment_id = p_equipment_id
      AND (p_exclude_booking_id IS NULL OR b.id <> p_exclude_booking_id)
      AND b.status IN ('pending', 'pending_admin_review', 'confirmed', 'out_for_delivery', 'in_transit', 'delivered')
      AND (b.status NOT IN ('pending', 'pending_admin_review') OR b.hold_expires_at IS NULL OR b.hold_expires_at > now())
  ),
  per_day AS (
    SELECT d.day, COALESCE(SUM(c.quantity), 0) AS committed_qty
    FROM days d
    LEFT JOIN committed c
      ON d.day BETWEEN c.start_date AND (c.end_date + ((SELECT buffer_days FROM cfg) || ' days')::interval)::date
    GROUP BY d.day
  )
  SELECT GREATEST(0, (SELECT stock FROM cfg) - COALESCE(MAX(committed_qty), 0))::int
  FROM per_day;
$$;

-- Bulk availability for a set of equipment (NULL = all). Powers the Phase 2 catalog.
CREATE OR REPLACE FUNCTION public.get_equipment_availability(
  p_start date,
  p_end date,
  p_equipment_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (equipment_id uuid, available_units int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id, public.equipment_available_units(e.id, p_start, p_end)
  FROM public.equipment e
  WHERE p_equipment_ids IS NULL OR e.id = ANY(p_equipment_ids);
$$;

GRANT EXECUTE ON FUNCTION public.equipment_available_units(uuid, date, date, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_availability(date, date, uuid[]) TO anon, authenticated;
```

- [ ] **Step 2: Apply and verify against a known fixture**

Run: `npx supabase migration up`
Then in the SQL editor, pick an equipment id with known `stock_quantity` and no overlapping bookings:
Run: `select public.equipment_available_units('<equipment-uuid>', '2026-12-01', '2026-12-05');`
Expected: equals that equipment's `stock_quantity`.

Create one confirmed booking of qty 1 for those dates, then re-run:
Expected: `stock_quantity - 1`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260601000001_w1_availability_functions.sql
git commit -m "feat(db): equipment_available_units + get_equipment_availability RPCs"
```

---

## Task 4: Pre-check function `check_booking_availability`

**Files:**
- Modify: `supabase/migrations/20260601000001_w1_availability_functions.sql` (append)

- [ ] **Step 1: Append the function**

```sql
-- Pre-check a multi-item cart for a date range. Returns { ok, conflicts: [{equipment_id, requested, available}] }.
CREATE OR REPLACE FUNCTION public.check_booking_availability(
  p_start date,
  p_end date,
  p_items jsonb,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item jsonb;
  v_equipment_id uuid;
  v_qty int;
  v_available int;
  v_conflicts jsonb := '[]'::jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_equipment_id := (v_item->>'equipment_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    v_available := public.equipment_available_units(v_equipment_id, p_start, p_end, p_exclude_booking_id);
    IF v_available < v_qty THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'equipment_id', v_equipment_id, 'requested', v_qty, 'available', v_available
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', jsonb_array_length(v_conflicts) = 0, 'conflicts', v_conflicts);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_booking_availability(date, date, jsonb, uuid) TO anon, authenticated;
```

- [ ] **Step 2: Apply and verify**

Run: `npx supabase migration up`
Run: `select public.check_booking_availability('2026-12-01','2026-12-05','[{"equipment_id":"<uuid>","quantity":999}]'::jsonb);`
Expected: `{"ok": false, "conflicts": [{"equipment_id": "<uuid>", "requested": 999, "available": <n>}]}`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260601000001_w1_availability_functions.sql
git commit -m "feat(db): check_booking_availability pre-check RPC"
```

---

## Task 5: Race-safe `create_booking_with_items`

**Files:**
- Modify: `supabase/migrations/20260601000001_w1_availability_functions.sql` (append)

- [ ] **Step 1: Append the function**

```sql
-- Atomic, race-safe booking creation. Locks the referenced equipment rows (deterministic order),
-- re-checks availability, then inserts the booking + items. Raises AVAILABILITY_CONFLICT on oversell.
CREATE OR REPLACE FUNCTION public.create_booking_with_items(
  p_booking jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start date := (p_booking->>'start_date')::date;
  v_end date := (p_booking->>'end_date')::date;
  v_hold_hours int := COALESCE(
    (SELECT setting_value::int FROM public.system_settings WHERE setting_key = 'hold_window_hours' AND is_active), 48);
  v_hold_expires timestamptz := now() + (v_hold_hours || ' hours')::interval;
  v_booking_id uuid;
  v_item jsonb;
  v_available int;
  v_conflicts jsonb := '[]'::jsonb;
BEGIN
  IF v_start IS NULL OR v_end IS NULL OR v_end < v_start THEN
    RAISE EXCEPTION 'Invalid rental dates';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;

  -- Serialize concurrent bookings for the same equipment via row locks in a deterministic order.
  PERFORM 1
  FROM public.equipment e
  WHERE e.id IN (SELECT (i->>'equipment_id')::uuid FROM jsonb_array_elements(p_items) i)
  ORDER BY e.id
  FOR UPDATE;

  -- Re-check availability now that rows are locked.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_available := public.equipment_available_units((v_item->>'equipment_id')::uuid, v_start, v_end);
    IF v_available < (v_item->>'quantity')::int THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'equipment_id', (v_item->>'equipment_id')::uuid,
        'requested', (v_item->>'quantity')::int,
        'available', v_available);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_conflicts) > 0 THEN
    RAISE EXCEPTION 'AVAILABILITY_CONFLICT: %', v_conflicts::text;
  END IF;

  INSERT INTO public.bookings (
    user_id, start_date, end_date, total_amount, status,
    customer_name, customer_email, customer_phone, customer_address,
    room_number, customer_comment, delivery_slot, pickup_slot,
    payment_status, hold_expires_at
  ) VALUES (
    auth.uid(), v_start, v_end, (p_booking->>'total_amount')::numeric, 'pending_admin_review',
    p_booking->>'customer_name', lower(p_booking->>'customer_email'),
    COALESCE(p_booking->>'customer_phone', ''), COALESCE(p_booking->>'customer_address', ''),
    NULLIF(p_booking->>'room_number', ''), NULLIF(p_booking->>'customer_comment', ''),
    p_booking->>'delivery_slot', p_booking->>'pickup_slot',
    'pending', v_hold_expires
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, equipment_id, equipment_name, equipment_price, quantity, subtotal)
  SELECT v_booking_id, (i->>'equipment_id')::uuid, i->>'equipment_name',
         (i->>'equipment_price')::numeric, (i->>'quantity')::int, (i->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) i;

  RETURN jsonb_build_object('booking_id', v_booking_id, 'hold_expires_at', v_hold_expires);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_with_items(jsonb, jsonb) TO anon, authenticated;
```

> Note: the existing `trigger_booking_audit_log` on `bookings` auto-logs the INSERT, so no manual audit write is needed here.

- [ ] **Step 2: Apply and verify a normal insert**

Run: `npx supabase migration up`
Run a valid create (use a real equipment id, qty within stock):
```sql
select public.create_booking_with_items(
  '{"start_date":"2026-12-01","end_date":"2026-12-05","total_amount":100,"customer_name":"Test","customer_email":"t@example.com","delivery_slot":"morning","pickup_slot":"morning"}'::jsonb,
  '[{"equipment_id":"<uuid>","equipment_name":"X","equipment_price":10,"quantity":1,"subtotal":40}]'::jsonb);
```
Expected: returns `{"booking_id":"...","hold_expires_at":"..."}`; the booking exists with `status='pending_admin_review'` and a non-null `hold_expires_at`.

- [ ] **Step 3: Verify oversell is rejected**

Call again with `"quantity": <stock+1>`.
Expected: error `AVAILABILITY_CONFLICT: [{"equipment_id":...,"requested":...,"available":...}]`.

- [ ] **Step 4: Verify concurrency (manual)**

Open two SQL sessions. In session A run `BEGIN;` then the create for the **last** available unit (do not commit). In session B run the same create — it should **block**. Commit A; B then proceeds and returns an `AVAILABILITY_CONFLICT`. Document the observed result in the PR description.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601000001_w1_availability_functions.sql
git commit -m "feat(db): create_booking_with_items atomic race-safe booking RPC"
```

---

## Task 6: Hold expiry job + backfill + service-task guard

**Files:**
- Create: `supabase/migrations/20260601000002_w1_hold_expiry.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260601000002_w1_hold_expiry.sql
-- W1 Phase 1: auto-expire unconfirmed holds.

-- 1. Backfill: give existing pending requests a FRESH window so day-one cleanup doesn't mass-expire history.
UPDATE public.bookings
SET hold_expires_at = now() + (
  COALESCE((SELECT setting_value::int FROM public.system_settings WHERE setting_key = 'hold_window_hours' AND is_active), 48)
  || ' hours')::interval
WHERE status IN ('pending', 'pending_admin_review') AND hold_expires_at IS NULL;

-- 2. expire_holds(): flip expired unconfirmed holds to 'expired'. Returns count expired.
CREATE OR REPLACE FUNCTION public.expire_holds()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.bookings
    SET status = 'expired', updated_at = now()
    WHERE status IN ('pending', 'pending_admin_review')
      AND hold_expires_at IS NOT NULL
      AND hold_expires_at <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_holds() TO authenticated, service_role;

-- 3. Keep the service-task trigger from materializing tasks for expired holds.
--    (Reproduces the existing guard with 'expired' added; rest of the body is unchanged.)
CREATE OR REPLACE FUNCTION public.upsert_booking_service_tasks(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_assigned_driver_id uuid;
  v_delivery_window_start timestamptz;
  v_delivery_window_end timestamptz;
  v_pickup_window_start timestamptz;
  v_pickup_window_end timestamptz;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_booking.status IN ('pending', 'pending_admin_review', 'expired') THEN
    DELETE FROM public.booking_service_tasks WHERE booking_id = p_booking_id;
    RETURN;
  END IF;

  v_assigned_driver_id := COALESCE(v_booking.assigned_driver_id, v_booking.assigned_to);

  SELECT window_start, window_end INTO v_delivery_window_start, v_delivery_window_end
  FROM public.get_service_window(v_booking.start_date, COALESCE(v_booking.delivery_slot, 'morning'));
  SELECT window_start, window_end INTO v_pickup_window_start, v_pickup_window_end
  FROM public.get_service_window(v_booking.end_date, COALESCE(v_booking.pickup_slot, 'morning'));

  INSERT INTO public.booking_service_tasks (
    booking_id, task_type, assigned_driver_id, scheduled_for, eta_window_start, eta_window_end, status)
  VALUES (
    v_booking.id, 'delivery', v_assigned_driver_id,
    COALESCE(v_booking.delivery_scheduled_at, v_delivery_window_start),
    v_delivery_window_start, v_delivery_window_end,
    public.derive_service_task_status(v_booking.status, 'delivery'))
  ON CONFLICT (booking_id, task_type) DO UPDATE SET
    assigned_driver_id = EXCLUDED.assigned_driver_id,
    scheduled_for = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.scheduled_for ELSE booking_service_tasks.scheduled_for END,
    eta_window_start = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_start ELSE booking_service_tasks.eta_window_start END,
    eta_window_end = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_end ELSE booking_service_tasks.eta_window_end END,
    status = CASE
      WHEN EXCLUDED.status = 'cancelled' THEN 'cancelled'
      WHEN EXCLUDED.status = 'completed' THEN 'completed'
      WHEN booking_service_tasks.status = 'failed' AND EXCLUDED.status = 'en_route' THEN 'en_route'
      WHEN booking_service_tasks.status IN ('completed', 'cancelled') THEN booking_service_tasks.status
      ELSE booking_service_tasks.status END,
    updated_at = now();

  INSERT INTO public.booking_service_tasks (
    booking_id, task_type, assigned_driver_id, scheduled_for, eta_window_start, eta_window_end, status)
  VALUES (
    v_booking.id, 'pickup', v_assigned_driver_id,
    COALESCE(v_booking.pickup_scheduled_at, v_pickup_window_start),
    v_pickup_window_start, v_pickup_window_end,
    public.derive_service_task_status(v_booking.status, 'pickup'))
  ON CONFLICT (booking_id, task_type) DO UPDATE SET
    assigned_driver_id = EXCLUDED.assigned_driver_id,
    scheduled_for = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.scheduled_for ELSE booking_service_tasks.scheduled_for END,
    eta_window_start = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_start ELSE booking_service_tasks.eta_window_start END,
    eta_window_end = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_end ELSE booking_service_tasks.eta_window_end END,
    status = CASE
      WHEN EXCLUDED.status = 'cancelled' THEN 'cancelled'
      WHEN EXCLUDED.status = 'completed' THEN 'completed'
      WHEN booking_service_tasks.status IN ('completed', 'cancelled') THEN booking_service_tasks.status
      ELSE booking_service_tasks.status END,
    updated_at = now();
END;
$$;

-- 4. Schedule expiry every 15 minutes. pg_cron must be enabled (Supabase Dashboard > Database > Extensions).
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('expire-booking-holds', '*/15 * * * *', $$ SELECT public.expire_holds(); $$);
```

- [ ] **Step 2: Apply and verify expiry logic**

Run: `npx supabase migration up`
Create a booking via the RPC, then force-expire it:
```sql
update public.bookings set hold_expires_at = now() - interval '1 hour' where id = '<booking-id>';
select public.expire_holds();             -- expect >= 1
select status from public.bookings where id = '<booking-id>';  -- expect 'expired'
select count(*) from public.booking_service_tasks where booking_id = '<booking-id>'; -- expect 0
```
Expected: status becomes `expired`, no service tasks created.

- [ ] **Step 3: Verify the cron job is registered**

Run: `select jobname, schedule from cron.job where jobname = 'expire-booking-holds';`
Expected: one row, schedule `*/15 * * * *`. (If `pg_cron` is not enabled on the project, enable it in the dashboard and re-run the `cron.schedule` line; record this in the PR.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601000002_w1_hold_expiry.sql
git commit -m "feat(db): auto-expire unconfirmed holds via pg_cron + guard service tasks"
```

---

## Task 7: Wire booking submission to the RPC

**Files:**
- Create: `src/lib/queries/booking-create.ts`, `src/lib/queries/booking-create.test.ts`
- Modify: `src/hooks/useBooking.ts:344-393`

- [ ] **Step 1: Write failing tests for the helpers**

```ts
// src/lib/queries/booking-create.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildCreateBookingArgs, parseAvailabilityConflict } from './booking-create';

describe('buildCreateBookingArgs', () => {
  it('maps booking form data to the RPC argument shape', () => {
    const args = buildCreateBookingArgs({
      startDate: '2026-12-01', endDate: '2026-12-05', totalAmount: 100,
      customerInfo: { name: 'Jane', email: 'JANE@X.com', phone: '297', address: 'Hotel', room_number: '', comment: '' },
      deliverySlot: 'morning', pickupSlot: 'afternoon',
      items: [{ equipment_id: 'eq1', equipment_name: 'Chair', equipment_price: 10, quantity: 2, subtotal: 80 }],
    });
    expect(args.p_booking).toMatchObject({ start_date: '2026-12-01', customer_name: 'Jane', delivery_slot: 'morning', total_amount: 100 });
    expect(args.p_items).toHaveLength(1);
    expect(args.p_items[0]).toMatchObject({ equipment_id: 'eq1', quantity: 2 });
  });
});

describe('parseAvailabilityConflict', () => {
  it('extracts conflicts from the RPC error message', () => {
    const msg = 'AVAILABILITY_CONFLICT: [{"equipment_id":"eq1","requested":3,"available":1}]';
    expect(parseAvailabilityConflict(msg)).toEqual([{ equipment_id: 'eq1', requested: 3, available: 1 }]);
  });
  it('returns null for unrelated errors', () => {
    expect(parseAvailabilityConflict('some other error')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/queries/booking-create.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helpers + rpc wrapper**

```ts
// src/lib/queries/booking-create.ts
import { supabase } from '@/integrations/supabase/client';
import type { BookingItem, CustomerInfo } from '@/types/types';

export interface CreateBookingInput {
  startDate: string;
  endDate: string;
  totalAmount: number;
  customerInfo: CustomerInfo;
  deliverySlot?: 'morning' | 'afternoon';
  pickupSlot?: 'morning' | 'afternoon';
  items: BookingItem[];
}

export interface AvailabilityConflict {
  equipment_id: string;
  requested: number;
  available: number;
}

export function buildCreateBookingArgs(input: CreateBookingInput) {
  return {
    p_booking: {
      start_date: input.startDate,
      end_date: input.endDate,
      total_amount: input.totalAmount,
      customer_name: input.customerInfo.name.trim(),
      customer_email: input.customerInfo.email.trim().toLowerCase(),
      customer_phone: input.customerInfo.phone?.trim() || '',
      customer_address: input.customerInfo.address?.trim() || '',
      room_number: input.customerInfo.room_number?.trim() || '',
      customer_comment: input.customerInfo.comment?.trim() || '',
      delivery_slot: input.deliverySlot,
      pickup_slot: input.pickupSlot,
    },
    p_items: input.items.map((i) => ({
      equipment_id: i.equipment_id,
      equipment_name: i.equipment_name,
      equipment_price: i.equipment_price,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
  };
}

export function parseAvailabilityConflict(message: string): AvailabilityConflict[] | null {
  const marker = 'AVAILABILITY_CONFLICT:';
  const idx = message.indexOf(marker);
  if (idx === -1) return null;
  try {
    return JSON.parse(message.slice(idx + marker.length).trim());
  } catch {
    return null;
  }
}

export async function createBookingWithItems(input: CreateBookingInput): Promise<{ bookingId: string }> {
  const args = buildCreateBookingArgs(input);
  const { data, error } = await supabase.rpc('create_booking_with_items', args);
  if (error) throw error;
  return { bookingId: (data as { booking_id: string }).booking_id };
}
```

- [ ] **Step 4: Run to verify the helper tests pass**

Run: `npx vitest run src/lib/queries/booking-create.test.ts`
Expected: PASS.

- [ ] **Step 5: Replace the inserts in `useBooking.ts`**

In `src/hooks/useBooking.ts`, replace the `Step 1`/`Step 2` insert blocks (lines ~344–393) with a single call. Keep the notification (Step 3) and email (Step 4) blocks, sourcing `booking.id` from the returned id.

```ts
      let bookingId: string | null = null;

      try {
        const { bookingId: createdId } = await createBookingWithItems({
          startDate: bookingData.startDate,
          endDate: bookingData.endDate,
          totalAmount: calculateTotal(),
          customerInfo: bookingData.customerInfo,
          deliverySlot: bookingData.deliverySlot,
          pickupSlot: bookingData.pickupSlot,
          items: bookingData.items,
        });
        bookingId = createdId;
        const booking = { id: createdId };
        // ...existing Step 3 (admin_notifications) and Step 4 (send-reservation-email) unchanged,
        // using booking.id...
```

Add the import at the top:
```ts
import { createBookingWithItems, parseAvailabilityConflict } from '@/lib/queries/booking-create';
```

In the `catch (error)` block (around line 458), surface conflicts before the generic message:
```ts
        const rawMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        const conflicts = parseAvailabilityConflict(rawMessage);
        const errorMessage = conflicts
          ? `Some items are no longer available for your dates: ${conflicts.map((c) => `${c.requested} requested, ${c.available} left`).join('; ')}`
          : rawMessage;
        toast({ title: 'Reservation Failed', description: errorMessage, variant: 'destructive' });
```

> Removal note: the booking-then-items rollback `delete` (lines ~462–470) is no longer needed — the RPC is atomic — but it is harmless to leave for the notification/email failure path. Leave it as a safety net.

- [ ] **Step 6: Verify build + existing tests**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Run: `npx vitest run`
Expected: type-check clean; all tests pass (existing + the two new suites).

- [ ] **Step 7: Commit**

```bash
git add src/lib/queries/booking-create.ts src/lib/queries/booking-create.test.ts src/hooks/useBooking.ts
git commit -m "feat(booking): submit via atomic create_booking_with_items RPC with conflict handling"
```

---

## Task 8: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Manual happy-path booking**

Run the app (`npm run dev`), add equipment to the cart, complete a booking. Confirm in Supabase that the new `bookings` row has `status='pending_admin_review'` and a `hold_expires_at` ~48h out.

- [ ] **Step 2: Oversell prevention**

With an equipment item at `stock_quantity = 1`, create one booking for a date range, then attempt a second overlapping booking for the same item/dates. Expected: the second submission shows the "no longer available" message and creates no row.

- [ ] **Step 3: Non-overlap allowed**

Book the same single-stock item for a clearly non-overlapping date range. Expected: success.

- [ ] **Step 4: Expiry**

Force `hold_expires_at` into the past for a pending booking, run `select public.expire_holds();`, confirm the item becomes bookable again and the booking shows `status='expired'`.

- [ ] **Step 5: Regression**

Run: `npx vitest run`
Expected: all suites pass, including the existing driver-flow and booking tests.

- [ ] **Step 6: Final commit / PR**

```bash
git add -A
git commit -m "test(availability): document W1 Phase 1 end-to-end verification"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** date-aware availability (Tasks 1,3), prevent double-booking incl. concurrency (Task 5), hold-on-request + auto-expiry (Tasks 5,6), configurable buffer global + per-category (Tasks 2,3), guest booking preserved (Task 5 `auth.uid()` nullable), `availability_status` decoupled (Task 2). Dates-first browsing UI is intentionally Phase 2 (separate plan).
- **Placeholder scan:** none — all steps contain runnable code/SQL/commands.
- **Type consistency:** `equipment_available_units(uuid,date,date,uuid)`, `create_booking_with_items(jsonb,jsonb)`, `buildCreateBookingArgs`/`parseAvailabilityConflict`/`createBookingWithItems`, and the `AVAILABILITY_CONFLICT:` contract are used identically across DB and TS tasks.
- **Known follow-ups (Phase 2 / later W-streams):** admin date-range availability checker UI, edit-booking exclude-self wiring (uses the already-built `p_exclude_booking_id`), and an admin settings control for the hold window/buffer.
