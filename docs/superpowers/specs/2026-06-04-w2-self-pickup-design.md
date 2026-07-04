# W2 — Customer Self-Pickup + Depot Attendant App (Design Spec)

- **Status:** Draft for review
- **Date:** 2026-06-04
- **Branch:** `test_environment`
- **Program context:** Workstream 2 of the test_environment completion roadmap. Builds on W1 (date-aware availability + `create_booking_with_items`) and reuses the existing delivery / `booking_service_tasks` infrastructure.

## 1. Problem

Today every booking is **delivery-only**: a driver delivers the gear to the customer's hotel at the start and collects it at the end. The business also operates a store (Coral Plaza) and wants customers to be able to **collect and return equipment themselves**, and wants a fast **counter/depot screen** for a co-worker to hand gear over and check it back in — working even when the depot's wifi drops. Several booking-flow papercuts also need fixing (a redundant equipment-selection step, delivery-only copy, and a missing post-submit confirmation page).

## 2. Goals

1. Let a customer choose **Delivery or Pickup** at checkout; pickup has **no delivery fee** and shows the **store location + hours**.
2. Give pickup customers a **pickup number + QR** as proof, shown on a proper **confirmation page** and emailed.
3. A **depot attendant screen** to scan the QR / type the number, **hand over** (mark collected, capture name + optional signature) and **check in returns** (mark returned + optional condition note) — usable by a new **Store-staff** role and by Booker/Admin.
4. The depot screen works **online and offline** (cache today's pickups, queue actions, sync on reconnect).
5. Fix the booking flow: **remove the duplicate equipment step**, update copy to "delivery and pickup."
6. Leave the **delivery flow untouched**.

## 3. Non-goals (YAGNI)

Deposits / ID holds at pickup; online card payment (stays manual payment-links); pickup **time slots** (store-hours only); route/GPS for pickup (no driver involved); the driver-app background-GPS work (that's W3).

## 4. Key decisions (from brainstorming, 2026-06-04)

| Decision | Choice |
|---|---|
| Fulfillment model | Extend the existing two-task (`delivery`=out, `pickup`=back) model with a `fulfillment_method` switch; for pickup those tasks become **depot hand-over / depot return** (no driver) |
| Pickup timing | **Store hours, no slot** — customer brings their code whenever the store is open |
| Who attends the depot | **New `StoreStaff` role + Booker/Admin/SuperUser** |
| Hand-over / return capture | **Name + optional signature** (hand-over) and **mark returned + optional condition note** |
| Customer code | Short human-friendly **`pickup_code`** (e.g. `TLA-7Q4K`); the QR encodes that code |
| Offline | **Cache active pickups + queue actions + sync** (fits "occasional dead zones"); not a signed-token scheme |
| Packaging | One codebase; the depot screen runs as a web/PWA screen now, **Capacitor**-wrapped for camera + offline store (per the saved architecture decision) |
| Build order | Customer-facing **and** depot app together, delivered in phases (§16) |

## 5. Data model

**`bookings`**
- `fulfillment_method TEXT NOT NULL DEFAULT 'delivery' CHECK (fulfillment_method IN ('delivery','pickup'))`.
- `pickup_code TEXT UNIQUE` — set for pickup bookings, NULL for delivery. Index for instant lookup.
- (existing `delivered_at`/`picked_up_at` are reused as **collected_at** / **returned_at** for pickup bookings — same column, fulfillment-aware semantics; no new columns needed.)

**`system_settings`** new keys: `store_name`, `store_address` (default "Caya Taratata 15, Unit 11 – Coral Plaza"), `store_hours` (free text, e.g. "Mon–Sat 9:00–17:00"). Editable in admin Site Settings.

**Role** — add `StoreStaff` to the `app_role` enum + `component_visibility` seeding + `useAuth` permission map.

**`booking_service_tasks`** — no new columns required: a task is "depot-attended" iff its booking's `fulfillment_method = 'pickup'`. (An optional denormalized `is_depot BOOLEAN` may be added for query convenience during implementation if joins prove awkward; default off.)

**`pickup_code` generation** — a `generate_pickup_code()` SQL function: `'TLA-' || 4 chars` from an unambiguous alphabet (no `0/O/1/I`), retry on unique collision.

## 6. Customer checkout (booking flow)

- A **Delivery / Pickup** selector near the top of the booking form.
  - **Pickup:** hide the delivery-address fields and the delivery/pickup **slot selectors**; show a **store-location card** (name, address, hours); set delivery fee to 0 in the summary.
  - **Delivery:** unchanged (address + slots + fee).
- **Remove `EquipmentSelection`** from `BookingForm.tsx` (cart items already render in `BookingSummary`); update headings/copy to mention delivery **and** pickup.
- Submit calls the W1 `create_booking_with_items` RPC, **extended** to accept `fulfillment_method`; for pickup it generates the `pickup_code` and ignores any delivery fee. (`customer_address` becomes optional when `fulfillment_method='pickup'`.)

## 7. After submit

- **Confirmation page** (`/reservation/:id` or a confirmation state) replacing the disappear-then-redirect toast: "Reservation received — we'll confirm and send a payment link." For **pickup** it additionally shows the **pickup number, a QR of it, the store address + hours**, and "bring this to the store to collect."
- **Confirmation email** on submit via the existing `send-reservation-email` edge function, extended to include the pickup code/QR + store info for pickup orders. ⚠️ **Dependency:** reliable delivery still needs the Resend configuration the README flags; we wire the content here and verify Resend separately.

## 7a. Booking lifecycle for pickup

`pending_admin_review` → (admin confirm) `pending`/awaiting payment → (paid) `confirmed` → **collected at depot** → (returned) `completed`. Same statuses as delivery; the difference is who performs the two movements and where.

## 8. Service tasks for pickup (reuse)

The `upsert_booking_service_tasks` trigger still creates the two tasks for active bookings, but when `fulfillment_method='pickup'`:
- `assigned_driver_id = NULL` (no driver),
- `scheduled_for` = the rental start (hand-over) / end (return) **date**, with no ETA windows (no slots),
- the tasks are surfaced on the **depot screen**, not the driver dashboard.

**Depot completion RPCs** (new, mirroring the delivery ones but depot-appropriate and not requiring a driver):
- `complete_depot_handover(p_booking_id, p_collected_by_name, p_signature_path DEFAULT NULL, p_notes DEFAULT NULL)` — completes the `delivery` task, sets `bookings.delivered_at` (gear now with the customer), status → `delivered`, writes audit. Signature optional.
- `complete_depot_return(p_booking_id, p_returned_by_name DEFAULT NULL, p_condition_note DEFAULT NULL)` — completes the `pickup` task, sets `bookings.picked_up_at` (returned), status → `completed`, writes audit.
Both are `SECURITY DEFINER`, gated to StoreStaff/Booker/Admin/SuperUser, and **idempotent** (safe to replay from the offline queue). The strict delivery `complete_delivery_task` (which mandates a signature + issues a delivery slip) is left unchanged for driver deliveries.

## 9. Depot attendant app

A **pickup screen** (route e.g. `/depot`), accessible to `StoreStaff`, `Booker`, `Admin`, `SuperUser`:
- **Find an order:** scan the QR (camera) or type the pickup number → resolves to the booking → shows customer, items, dates, fulfillment status, and which action is due (hand-over vs return).
- **Hand over:** confirm items, capture **collected-by name + optional signature** (reuse `SignaturePad`/`DeliveryProofDialog` components), call `complete_depot_handover`.
- **Check in return:** mark **returned + optional condition note**, call `complete_depot_return`.
- **Today's pickups list:** the bookings due for collection/return, for quick walk-up handling.

**QR/scan:** a JS scanner library in the browser/PWA (e.g. `@zxing/browser` / `html5-qrcode`) with a **manual code-entry fallback**; the Capacitor build uses the native barcode/camera plugin. The QR encodes the raw `pickup_code` so it resolves offline.

## 10. Offline architecture

- **Cache:** on load (when online), the depot screen fetches active pickup bookings (`fulfillment_method='pickup'`, status in the active set, dates within a window) via a `get_depot_pickups()` RPC and stores them in **IndexedDB** (code → booking + items).
- **Lookup offline:** a scanned/typed code is matched against the IndexedDB cache — resolves with no network.
- **Actions offline:** `complete_depot_handover` / `complete_depot_return` are **queued** in IndexedDB and applied optimistically; a sync worker replays them (idempotent RPCs) when connectivity returns. A small "pending sync" indicator shows queued count.
- **Conflict/idempotency:** completion RPCs no-op if the task is already completed, so replays and double-scans are safe.

## 11. Roles & access

- New `StoreStaff` role: sees the **depot screen only** (least privilege). Booker/Admin/SuperUser also reach it. RLS on the depot RPCs and `get_depot_pickups()` restricts to these roles.
- Delivery/driver flows and existing roles are unchanged.

## 12. Security / RLS

- `create_booking_with_items` already runs as definer; extend it for `fulfillment_method`/`pickup_code` without widening access (still inserts the caller's own booking).
- `get_depot_pickups`, `complete_depot_handover`, `complete_depot_return`: `SECURITY DEFINER`, `SET search_path = ''`, granted to `authenticated`, with an internal role check (`StoreStaff`/`Booker`/`Admin`/`SuperUser`).
- `pickup_code` is a low-value lookup token (not a payment secret); guessing is mitigated by the unambiguous-but-random alphabet and that completion requires a staff session.

## 13. Migration & rollout safety

- Additive: new column defaults `delivery`, so all existing bookings stay delivery — **no behavior change** for current data.
- Backfill: existing bookings get `fulfillment_method='delivery'`, `pickup_code=NULL`.
- The `fulfillment` checkout UI can sit behind a `system_settings` flag (`pickup_enabled`) so it can be turned on when the store is ready.

## 14. Testing

- **Unit:** fee math for pickup (no delivery fee), `pickup_code` format/uniqueness, fulfillment-aware availability still correct, offline queue serialize/replay + idempotency, code↔QR round-trip.
- **Integration:** create a pickup booking via the RPC (code generated, no fee); depot hand-over + return complete and set collected/returned + status; depot RPCs reject non-staff.
- **Offline:** lookup resolves from cache with the network disabled; queued actions sync and are idempotent on replay.
- **Regression:** the entire delivery flow (driver tasks, signature, delivery slip, tracking) is unaffected.

## 15. Reuse summary

Reuses: W1 availability + `create_booking_with_items`; the `booking_service_tasks` lifecycle; `SignaturePad`/`DeliveryProofDialog`; `booking_audit_log`; existing booking statuses; `system_settings` + admin Site Settings; the existing Cart/booking components.

## 16. Implementation phases (for the plan)

Because this is large, the implementation plan will sequence it so each phase is shippable:
1. **Data model + pickup-aware booking creation** (`fulfillment_method`, `pickup_code`, settings, fee=0, availability stays correct).
2. **Customer checkout UI** (Delivery/Pickup selector, store-location card, remove duplicate equipment step, copy).
3. **Confirmation page + email** (with code/QR for pickup).
4. **Depot screen — online** (scan/lookup, hand-over + return, name/signature; `StoreStaff` role + depot RPCs + service-task handling for pickup).
5. **Depot screen — offline** (IndexedDB cache + queue + sync).
6. **Capacitor packaging** of the depot/staff screen (camera + offline store) — coordinated with W3's driver app.

## 17. Acceptance criteria

1. A customer can book with **Pickup**: no delivery fee, store location shown, a `pickup_code` + QR returned, no driver tasks created.
2. The booking form no longer has the duplicate equipment step; copy reflects delivery **and** pickup.
3. A proper **confirmation page** appears after submit (with code/QR for pickup); the reservation email includes them.
4. Depot staff can **scan/look up** a code, **hand over** (name + optional signature) and **check in a return** (optional note); booking status + collected/returned timestamps update; non-staff are rejected.
5. With the network **off**, a scan resolves from cache and the action **queues and later syncs** (idempotently).
6. **Delivery** bookings and the driver flow are unchanged; all tests pass.
