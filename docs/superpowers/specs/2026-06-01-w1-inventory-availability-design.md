# W1 — Inventory Accuracy & Availability (Design Spec)

- **Status:** Draft for review
- **Date:** 2026-06-01
- **Branch:** `test_environment`
- **Program context:** Workstream 1 of the test_environment completion roadmap (Foundation-first). This is the correctness base the later workstreams (W2 self-pickup, W3 driver collection, etc.) depend on.

## 1. Problem

The app is a date-based rental system, but availability is not date-aware:

- `bookings` never hold stock. Booking creation in [useBooking.ts](../../../src/hooks/useBooking.ts) inserts with status `pending_admin_review` and an explicit "no stock reservation yet" comment (L347); the only checks (`useCart` L21, `validateBookingData` L283) compare against a **global** `equipment.stock_quantity`.
- The existing `reserve_equipment_stock` / `release_equipment_stock` functions ([20250122000001_enhance_booking_system.sql](../../../supabase/migrations/20250122000001_enhance_booking_system.sql) L196–295) maintain a **single global `reserved_quantity` counter** with no notion of dates, so they cannot be "switched on" — a unit reserved for next week would wrongly reduce availability today.
- Result: the same unit can be booked for overlapping dates (oversell), and customers see stock that isn't actually free for their dates.

## 2. Goals

1. Compute **date-aware availability** per equipment for any requested rental window.
2. **Prevent double-booking**, including under concurrent requests (race-safe).
3. **Hold inventory on request** with a configurable auto-expiry (default 48h).
4. **Configurable turnaround buffer** between rentals (global default 0, optional per-category override).
5. **Dates-first browsing**: the customer picks rental dates up front; catalog/detail/cart reflect real availability for those dates.
6. Keep guest (anonymous) booking working.

## 3. Non-goals (explicitly out of W1)

Per-unit / serialized asset tracking; damage / condition reports; a full visual availability calendar (a simple date-range checker is in scope, a heatmap calendar is not); online card payment; changes to pricing rules. These belong to later workstreams.

## 4. Key decisions (from brainstorming, 2026-06-01)

| Decision | Choice |
|---|---|
| Availability architecture | **On-the-fly computation via Postgres RPCs** (no materialized ledger) |
| When stock is held | **On request**, with auto-expiry (default **48h**, configurable) |
| Turnaround buffer | **Configurable**: global setting (default 0 days) + optional per-category override |
| Where availability shows | **Dates-first browsing** (catalog/detail/cart all date-aware) |
| Expired holds | Flipped to new `expired` status by a scheduled job; customer emailed |
| `availability_status` | Repurposed as a **manual admin override** (e.g. out-of-service/maintenance), decoupled from the global counter |

## 5. Availability model

**Occupancy.** A booking `B` for equipment `E` occupies calendar days `[B.start_date, B.end_date + buffer(E)]` inclusive, where `buffer(E)` is the per-category override or the global default.

**Committed statuses** (consume inventory): `pending` and `pending_admin_review` *(both only while `now() < hold_expires_at`)*, `confirmed`, `out_for_delivery`, `in_transit`, `delivered`. (`pending` and `pending_admin_review` are treated identically for holds; the live flow uses `pending_admin_review`.)
**Released statuses** (free inventory): `completed`, `cancelled`, `rejected`, `undeliverable`, `expired`, and any pending request past its `hold_expires_at`.

**Availability for a requested window.** For equipment `E`, requested window `[start, end]`, the occupancy days are `D = [start, end + buffer(E)]`. For each day `d ∈ D`, `committed(E,d)` = sum of `booking_items.quantity` over all committed bookings of `E` whose occupancy includes `d` (excluding the booking being edited, when applicable).

```
available_units(E, start, end) = stock_quantity(E) − max_{d ∈ D} committed(E, d)
```

A request for `q` units fits iff `q ≤ available_units(E, start, end)`. The day-by-day scan is cheap because requested windows are short (min 3 days, capped at 365); we scan only the requested window, not all history.

## 6. Data model changes

**`bookings`**
- `hold_expires_at TIMESTAMPTZ NULL` — set to `created_at + hold_window` when a row is created with `pending_admin_review`; cleared (NULL) on confirm.
- New status value `expired` added to the app union ([types.ts:55](../../../src/types/types.ts#L55)) and to any DB-side `derive_*` / status logic.

**`system_settings`** (read via [useSystemSettings.tsx](../../../src/hooks/useSystemSettings.tsx)) — new keys:
- `hold_window_hours` (default `48`)
- `turnaround_buffer_days` (default `0`)

**`equipment_category`** — optional `turnaround_buffer_days INTEGER NULL` override (NULL = use global).

**`availability_status`** — semantics change to a manual override only (`Available` | `Temporarily Not Available`/out-of-service). The `stock_movements → update_equipment_availability` trigger ([enhance_booking_system.sql](../../../supabase/migrations/20250122000001_enhance_booking_system.sql) L302–321) is dropped so it no longer derives status from the global counter.

**Indexes** — `bookings(status, start_date, end_date)`, partial index on `bookings(hold_expires_at) WHERE status = 'pending_admin_review'`, and confirm `booking_items(equipment_id, booking_id)` is covered.

## 7. RPCs (all in a new migration)

1. **`get_equipment_availability(p_start date, p_end date, p_equipment_ids uuid[] DEFAULT NULL)` → `TABLE(equipment_id uuid, available_units int)`**
   - Computes §5 for each equipment (all, or the given subset). Powers the dates-first catalog and detail page. Read-only; safe for `anon` (returns counts only, no PII).

2. **`check_booking_availability(p_start date, p_end date, p_items jsonb)` → `jsonb`**
   - `p_items` = `[{equipment_id, quantity}]`. Returns `{ ok: bool, conflicts: [{equipment_id, requested, available}] }`. Lightweight pre-check for the Book page and admin confirm.

3. **`create_booking_with_items(p_booking jsonb, p_items jsonb)` → `jsonb` (SECURITY DEFINER)**
   - The single race-safe write path. Within one transaction: `SELECT ... FOR UPDATE` on the referenced `equipment` rows **ordered by `equipment_id`** (serializes competing requests for the same item; deterministic order avoids deadlock), recompute §5, reject with a structured error if any item doesn't fit, else insert the `booking` (status `pending_admin_review`, `hold_expires_at = now() + hold_window`, `user_id = auth.uid()` when present) + `booking_items`, write a `booking_audit_log` entry, and return the booking. Replaces the client-side inserts in [useBooking.ts](../../../src/hooks/useBooking.ts) L365–393.

Concurrency rationale: every creation path locks the equipment rows of its items `FOR UPDATE`, so two transactions touching the same equipment serialize on that row lock; the second blocks, then recomputes against the first's now-committed rows. (Advisory locks `pg_advisory_xact_lock(hashtext(equipment_id))` are an acceptable alternative.)

## 8. Scheduled hold expiry

A scheduled job (Supabase `pg_cron`, or a scheduled edge function if pg_cron is unavailable) runs periodically: sets `status = 'expired'` for `pending_admin_review` rows past `hold_expires_at`, writes an audit entry, and invokes the existing email path to notify the customer. Availability stays correct even if the job lags, because §5 already ignores expired holds via the `now() < hold_expires_at` check. Cadence and on/off via `system_settings`.

## 9. Frontend changes

- **`useRentalDates`** (new context/hook): the selected `{ startDate, endDate }`, persisted to URL query (`?start=&end=`) + localStorage; consumed by catalog, detail, cart, and Book page.
- **`useAvailability`** (new hook): TanStack Query wrapper over `get_equipment_availability` keyed by `(range, ids)`.
- **Catalog** [Equipment.tsx](../../../src/pages/Equipment.tsx): a prominent date-range picker. Browsable with no dates (SEO/landing intact). With dates set, each card shows "X available" or a disabled "Not available for these dates."
- **Detail** [EquipmentItem.tsx](../../../src/pages/EquipmentItem.tsx): quantity selector capped at `available_units` for the chosen dates.
- **Cart** [useCart.tsx](../../../src/hooks/useCart.tsx): date-aware. Dates are **one range for the whole order** (matches the single `start_date`/`end_date` per booking). Add-to-cart validates against availability.
- **Booking** [useBooking.ts](../../../src/hooks/useBooking.ts): dates carried in from catalog (still editable, re-validates on change); `submitBooking` calls `create_booking_with_items` instead of direct inserts; surfaces structured conflict errors.
- Data-access additions live in [src/lib/queries/bookings.ts](../../../src/lib/queries/bookings.ts) / a new `src/lib/queries/availability.ts`.

## 10. Admin changes

- **Confirm** re-checks availability through the RPC path (safe even though hold-on-request makes conflicts rare).
- **Date-range availability checker** reusing `get_equipment_availability`; integrate near the existing `src/components/admin/calendar/` components. (Full calendar = future.)
- **Manual stock adjustment / out-of-service**: admin can edit `stock_quantity` and set the `availability_status` override; both logged to `stock_movements` (`movement_type` `adjustment` / `maintenance`).
- **Edit booking** (dates/qty) re-checks availability **excluding the booking itself**.

## 11. Security / RLS

- `get_equipment_availability` and `check_booking_availability`: `GRANT EXECUTE` to `anon` + `authenticated` (catalog is public; outputs are counts only).
- `create_booking_with_items`: `SECURITY DEFINER`, `GRANT EXECUTE` to `anon` + `authenticated`; validates inputs, sets `user_id` from `auth.uid()` (NULL for guests), `SET search_path = public`. No elevation beyond inserting the caller's own booking.
- Existing booking/equipment RLS unchanged; the definer RPC is the controlled write path.

## 12. Migration & rollout safety

- **Backfill:** existing `confirmed`+ rows need no hold. Existing `pending_admin_review` rows get a **fresh** `hold_expires_at = now() + hold_window` (not `created_at + window`) so the new expiry job does **not** mass-expire historical pendings on day one; surface a report/notification for admin instead of silent deletion.
- **No destructive drops** of data tables; only the misleading availability trigger is removed. `reserved_quantity` column is retained (ignored) to avoid breaking anything reading it, and zeroed via a one-off update.
- **Phased rollout:** Phase 1 ship DB layer (RPCs, `hold_expires_at`, expiry job) and switch `submitBooking` to the atomic RPC — no visible UI change, immediate oversell protection. Phase 2 ship dates-first browsing UI. Phase 2 can sit behind a `system_settings` flag (`dates_first_browsing_enabled`) for safe enable/rollback.

## 13. Observability & audit

- Every hold, confirm, expire, release, and manual stock change writes to `booking_audit_log` / `stock_movements` (both already exist).
- `create_booking_with_items` returns structured conflict payloads (logged client-side) rather than opaque failures.

## 14. Testing

- **Unit (Vitest):** availability math — peak concurrency, buffer inclusivity, status filtering, exclude-self on edit, expired-hold exclusion. Extend [bookingOperations.test.ts](../../../src/lib/operations/bookingOperations.test.ts) / [bookings.test.ts](../../../src/lib/queries/bookings.test.ts).
- **Concurrency:** two parallel `create_booking_with_items` for the last unit → exactly one success.
- **Integration:** guest + authenticated booking via the RPC; admin confirm re-check; edit-booking exclude-self.
- **Regression:** existing driver-flow and booking smoke tests still pass.

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Abandoned holds block stock | 48h auto-expiry (configurable) + admin visibility |
| Availability query cost as data grows | Short requested windows + targeted indexes; can add materialized ledger later if needed |
| Concurrent oversell | `FOR UPDATE` row-lock serialization in the definer RPC |
| Legacy oversold/overlapping rows | Compute tolerates them; no crash; flagged in admin report |
| Dates-first UI regressions | Behind a settings flag; catalog still renders without dates |

## 16. Acceptance criteria

1. Two overlapping bookings for the same unit beyond stock are impossible via UI and via concurrent RPC calls.
2. Catalog/detail show correct per-date availability once dates are selected; unavailable items can't be added.
3. A submitted request holds stock immediately and auto-expires after the configured window, freeing stock.
4. Admin can confirm (permanent hold), adjust stock, and mark items out-of-service; all audited.
5. Configurable buffer is honored globally and per-category.
6. Guest booking still works end-to-end.
7. All new and existing tests pass.
