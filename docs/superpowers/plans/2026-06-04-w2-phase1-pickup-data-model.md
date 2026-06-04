# W2 Phase 1 — Pickup Data Model + Pickup-Aware Booking Creation (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add `fulfillment_method` (delivery|pickup) + a generated `pickup_code` to bookings, make the W1 booking-creation RPC pickup-aware (no delivery fee, code generated), and plumb `fulfillment_method` through the client — all additive, defaulting to delivery so nothing changes for existing/delivery bookings.

**Architecture:** Extends the W1 `create_booking_with_items` RPC and `bookings` schema. A new `generate_pickup_code()` SQL function makes short unique codes. The client carries `fulfillment_method` (default `'delivery'`) and zeroes the delivery fee for pickup. UI (Delivery/Pickup selector), the depot screen, and the `StoreStaff` role are later phases.

**Tech Stack:** Supabase Postgres (plpgsql RPCs), `supabase-js` v2 `.rpc()`, TypeScript, Vitest.

**Spec:** [docs/superpowers/specs/2026-06-04-w2-self-pickup-design.md](../specs/2026-06-04-w2-self-pickup-design.md) (Phase 1 of §16).

**Sequencing:** Tasks are sequential (RPC depends on schema; client depends on RPC). No safe parallelism within this phase.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260604000000_w2_pickup_schema.sql` (create) | `bookings.fulfillment_method` + `pickup_code`, indexes, `system_settings` (store info + `pickup_enabled` flag), `generate_pickup_code()`. |
| `supabase/migrations/20260604000001_w2_pickup_booking_rpc.sql` (create) | `CREATE OR REPLACE create_booking_with_items` made pickup-aware. |
| `src/lib/pricing/deliveryFee.ts` (create) | Pure delivery-fee helper that returns 0 for pickup. |
| `src/lib/pricing/deliveryFee.test.ts` (create) | Tests for the fee helper. |
| `src/lib/queries/booking-create.ts` (modify) | Add `fulfillmentMethod` to the input + RPC args; surface returned `pickup_code`. |
| `src/lib/queries/booking-create.test.ts` (modify) | Cover the new arg + pickup mapping. |
| `src/types/types.ts` (modify) | Add `fulfillment_method` + `pickup_code` to the booking type. |

---

## Task 1: Pickup schema + code generator

**Files:** Create `supabase/migrations/20260604000000_w2_pickup_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- W2 Phase 1: pickup data model.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS fulfillment_method TEXT NOT NULL DEFAULT 'delivery'
    CHECK (fulfillment_method IN ('delivery', 'pickup'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_pickup_code
  ON public.bookings(pickup_code) WHERE pickup_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_fulfillment_method
  ON public.bookings(fulfillment_method);

-- Store info + feature flag (idempotent)
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_active)
VALUES
  ('store_name', 'Travel Light Aruba', 'string', 'Pickup store display name', TRUE),
  ('store_address', 'Caya Taratata 15, Unit 11 (Coral Plaza)', 'string', 'Pickup store address', TRUE),
  ('store_hours', 'Mon–Sat 9:00–17:00', 'string', 'Pickup store opening hours', TRUE),
  ('pickup_enabled', 'false', 'boolean', 'Whether self-pickup is offered at checkout', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

-- Short, human-friendly, unique pickup code (no ambiguous chars).
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i int;
BEGIN
  LOOP
    v_code := 'TLA-';
    FOR v_i IN 1..4 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE pickup_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_pickup_code() TO authenticated;
```

- [ ] **Step 2: Apply + verify** — `npx supabase db push --db-url "<DB_URL>"`. Then:
  `select public.generate_pickup_code();` → returns e.g. `TLA-7Q4K` (8 chars, prefix `TLA-`).
  `select column_name from information_schema.columns where table_name='bookings' and column_name in ('fulfillment_method','pickup_code');` → 2 rows.
  `select setting_value from public.system_settings where setting_key='store_address';` → the Coral Plaza address.

- [ ] **Step 3: Commit** — `git add supabase/migrations/20260604000000_w2_pickup_schema.sql && git commit -m "feat(db): pickup fulfillment_method + pickup_code + store settings"`

---

## Task 2: Make `create_booking_with_items` pickup-aware

**Files:** Create `supabase/migrations/20260604000001_w2_pickup_booking_rpc.sql`

- [ ] **Step 1: Write the migration** (this is the W1 function + the text-cast fix, plus fulfillment_method/pickup_code)

```sql
-- W2 Phase 1: pickup-aware booking creation. Supersedes the W1 definition.
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
  v_fulfillment text := COALESCE(p_booking->>'fulfillment_method', 'delivery');
  v_pickup_code text := NULL;
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
  IF v_fulfillment NOT IN ('delivery', 'pickup') THEN
    RAISE EXCEPTION 'Invalid fulfillment_method: %', v_fulfillment;
  END IF;

  PERFORM 1
  FROM public.equipment e
  WHERE e.id IN (SELECT (i->>'equipment_id')::uuid FROM jsonb_array_elements(p_items) i)
  ORDER BY e.id
  FOR UPDATE;

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

  IF v_fulfillment = 'pickup' THEN
    v_pickup_code := public.generate_pickup_code();
  END IF;

  INSERT INTO public.bookings (
    user_id, start_date, end_date, total_amount, status,
    customer_name, customer_email, customer_phone, customer_address,
    room_number, customer_comment, delivery_slot, pickup_slot,
    payment_status, hold_expires_at, fulfillment_method, pickup_code
  ) VALUES (
    auth.uid(), v_start, v_end, (p_booking->>'total_amount')::numeric, 'pending_admin_review',
    p_booking->>'customer_name', lower(p_booking->>'customer_email'),
    COALESCE(p_booking->>'customer_phone', ''), COALESCE(p_booking->>'customer_address', ''),
    NULLIF(p_booking->>'room_number', ''), NULLIF(p_booking->>'customer_comment', ''),
    p_booking->>'delivery_slot', p_booking->>'pickup_slot',
    'pending', v_hold_expires, v_fulfillment, v_pickup_code
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, equipment_id, equipment_name, equipment_price, quantity, subtotal)
  SELECT v_booking_id, (i->>'equipment_id'), i->>'equipment_name',
         (i->>'equipment_price')::numeric, (i->>'quantity')::int, (i->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) i;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'hold_expires_at', v_hold_expires,
    'fulfillment_method', v_fulfillment,
    'pickup_code', v_pickup_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_with_items(jsonb, jsonb) TO anon, authenticated;
```

- [ ] **Step 2: Apply + verify** — `npx supabase db push --db-url "<DB_URL>"`. Then create a pickup booking inside a `DO $$ ... RAISE EXCEPTION ... $$` rollback block (so no test data persists), asserting the returned `pickup_code` is non-null and a delivery booking returns `pickup_code` null. (Pattern: the W1 verification rollback-via-RAISE.)

- [ ] **Step 3: Commit** — `git add supabase/migrations/20260604000001_w2_pickup_booking_rpc.sql && git commit -m "feat(db): pickup-aware create_booking_with_items (fulfillment_method + pickup_code)"`

---

## Task 3: Pure delivery-fee helper (no fee for pickup)

**Files:** Create `src/lib/pricing/deliveryFee.ts`, `src/lib/pricing/deliveryFee.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pricing/deliveryFee.test.ts
import { describe, it, expect } from 'vitest';
import { computeDeliveryFee } from './deliveryFee';

describe('computeDeliveryFee', () => {
  it('is 0 for pickup regardless of dates/length', () => {
    expect(computeDeliveryFee('pickup', '2026-12-06', 2)).toBe(0); // Sunday + short
    expect(computeDeliveryFee('pickup', '2026-12-07', 7)).toBe(0);
  });
  it('charges $20 for a Sunday delivery start', () => {
    expect(computeDeliveryFee('delivery', '2026-12-06', 3)).toBe(20); // 2026-12-06 is a Sunday
  });
  it('charges $10 for a short (<5 day) delivery', () => {
    expect(computeDeliveryFee('delivery', '2026-12-07', 3)).toBe(10); // Monday, 3 days
  });
  it('is free for a 5+ day delivery', () => {
    expect(computeDeliveryFee('delivery', '2026-12-07', 5)).toBe(0);
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/lib/pricing/deliveryFee.test.ts`.

- [ ] **Step 3: Implement** (mirrors the existing rules in useBooking.ts `calculateDeliveryFee`, plus the pickup short-circuit)

```ts
// src/lib/pricing/deliveryFee.ts
export type FulfillmentMethod = 'delivery' | 'pickup';

function isSunday(isoDate: string): boolean {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

// Pickup never has a delivery fee. Delivery: $20 Sunday start, else $10 if < 5 days, else free.
export function computeDeliveryFee(method: FulfillmentMethod, startDate: string, days: number): number {
  if (method === 'pickup') return 0;
  if (isSunday(startDate)) return 20;
  if (days < 5) return 10;
  return 0;
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/lib/pricing/deliveryFee.test.ts`.
- [ ] **Step 5: Commit** — `git add src/lib/pricing/deliveryFee.ts src/lib/pricing/deliveryFee.test.ts && git commit -m "feat(pricing): pure delivery-fee helper (free for pickup)"`

---

## Task 4: Plumb `fulfillment_method` through the client

**Files:** Modify `src/lib/queries/booking-create.ts`, `src/lib/queries/booking-create.test.ts`, `src/types/types.ts`

- [ ] **Step 1: Update the test** (add to the existing `buildCreateBookingArgs` describe in `booking-create.test.ts`)

```ts
  it('defaults fulfillment_method to delivery and passes pickup through', () => {
    const base = {
      startDate: '2026-12-01', endDate: '2026-12-05', totalAmount: 100,
      customerInfo: { name: 'Jane', email: 'j@x.com', phone: '297', address: 'Hotel', room_number: '', comment: '' },
      items: [{ equipment_id: 'eq1', equipment_name: 'Chair', equipment_price: 10, quantity: 2, subtotal: 80 }],
    };
    expect(buildCreateBookingArgs(base).p_booking.fulfillment_method).toBe('delivery');
    expect(buildCreateBookingArgs({ ...base, fulfillmentMethod: 'pickup' }).p_booking.fulfillment_method).toBe('pickup');
  });
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/lib/queries/booking-create.test.ts`.

- [ ] **Step 3: Implement** — in `src/lib/queries/booking-create.ts`:
  - Add to `CreateBookingInput`: `fulfillmentMethod?: 'delivery' | 'pickup';`
  - In `buildCreateBookingArgs`, add to `p_booking`: `fulfillment_method: input.fulfillmentMethod ?? 'delivery',`
  - Change `createBookingWithItems` return type/body to also surface the code:
    ```ts
    return {
      bookingId: (data as { booking_id: string }).booking_id,
      pickupCode: (data as { pickup_code: string | null }).pickup_code ?? null,
    };
    ```
    and update its return type to `Promise<{ bookingId: string; pickupCode: string | null }>`.

- [ ] **Step 4: Update the booking type** — in `src/types/types.ts`, add to the `SupabaseBookingData`/booking interface (near `status`): `fulfillment_method?: 'delivery' | 'pickup';` and `pickup_code?: string | null;`.

- [ ] **Step 5: Verify** — `npx tsc -p tsconfig.app.json --noEmit` (only the 3 known DynamicMap errors); `npx vitest run` (no new failures besides the pre-existing `SubGroupOrderSettings`). Note: `useBooking.ts` still calls `createBookingWithItems` and reads `bookingId` — confirm the added `pickupCode` field doesn't break that call site (it destructures `bookingId`, so it's fine).

- [ ] **Step 6: Commit** — `git add src/lib/queries/booking-create.ts src/lib/queries/booking-create.test.ts src/types/types.ts && git commit -m "feat(booking): carry fulfillment_method + return pickup_code in the create path"`

---

## Task 5: End-to-end verification (against the DB)

**Files:** none.

- [ ] **Step 1** — Confirm migrations are applied (Tasks 1–2) and the build is green: `npm run build` succeeds.
- [ ] **Step 2** — Via the DB, create a **pickup** booking through the RPC (rollback block): assert `fulfillment_method='pickup'`, a unique `pickup_code` is set, and availability is still enforced. Create a **delivery** booking: `pickup_code` is null. Confirm zero test rows persist.
- [ ] **Step 3** — Confirm existing delivery bookings are unaffected (`select count(*) from bookings where fulfillment_method <> 'delivery'` → only intentional test rows, which roll back).

---

## Self-Review (plan author)

- **Spec coverage (Phase 1 of §16):** `fulfillment_method` + `pickup_code` (Task 1), pickup-aware creation with code + no-fee plumbing (Tasks 2–4), store settings + `pickup_enabled` flag (Task 1), availability unchanged (Task 2 reuses W1 checks). Deferred by design: Delivery/Pickup UI (Phase 2), confirmation page/email (Phase 3), depot screen + `StoreStaff` role + service-task handling (Phases 4–5), Capacitor (Phase 6).
- **Placeholder scan:** none — every step has runnable SQL/TS/commands. `<DB_URL>` is the connection string supplied at apply time (not a code placeholder).
- **Type consistency:** `fulfillment_method` (`'delivery'|'pickup'`), `pickup_code`, `computeDeliveryFee(method, startDate, days)`, `buildCreateBookingArgs(...).p_booking.fulfillment_method`, and `createBookingWithItems(...) → { bookingId, pickupCode }` are consistent across tasks and match the RPC's returned keys (`fulfillment_method`, `pickup_code`).
