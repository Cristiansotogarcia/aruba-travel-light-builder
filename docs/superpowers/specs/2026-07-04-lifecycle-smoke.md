# Cross-role lifecycle smoke test — Travel Light Aruba

**Date:** 2026-07-04
**Purpose:** One end-to-end acceptance script the owner runs by hand to confirm the six
role dashboards behave as a single integrated system. Every step names the **actor role**,
the **screen**, the **action**, and the **expected visible result in every affected
dashboard**. Two rental variants are covered: **delivery** (driver drops off + collects) and
**self-pickup** (customer collects/returns at the depot).

## Roles & entry points (verified against `src/pages/Login.tsx` post-login redirect)

| Role | Lands on | Route guard (`src/App.tsx`) |
|------|----------|------------------------------|
| SuperUser / Admin | `/admin` | Admin, SuperUser |
| Booker | `/booker` | Booker, Admin, SuperUser |
| Accounting | `/accounting` | Accounting, Admin, SuperUser |
| Driver | `/driver-dashboard` | Driver |
| StoreStaff | `/depot` | StoreStaff, Booker, Admin, SuperUser |
| Customer | `/customer-dashboard` | Customer |

> Pre-req: seed one user per role. Have the **admin booking modal** (calendar → click a booking →
> `BookingViewModal`) open in one tab and the **customer dashboard** open in another (logged in as the
> booking's customer) so you can watch both react to each action.

Badge vocabulary is shared: booking-status and payment badges come from
`src/components/admin/calendar/statusUtils.ts`; fulfilment (delivery/pickup) badges from
`src/lib/delivery/serviceTasks.ts`. The same colors/labels must appear on admin, customer, and
driver screens for the same state.

---

## Part A — Delivery variant

### A0. Login routing (all roles)
- **Actor/Screen/Action:** Each role → `/login` → sign in.
- **Expected:** Each lands on the table row above. Specifically **StoreStaff lands on `/depot`**
  (previously fell through to `/`). While the profile loads, the shared `PageSkeleton` shows (no bare
  "Loading…").

### A1. Reserve (delivery)
- **Actor:** Customer — **Screen:** `/book` (public flow) — **Action:** pick dates + items with a
  street address (delivery), submit.
- **Expected:**
  - **Customer `/customer-dashboard`:** new card appears. Status badge **Pending Payment** (or **Pending
    Admin Review** if routed to review), payment badge **Unpaid**, and an amber
    *"Reserved for you until <hold expiry>"* line. Change-dates / Cancel buttons show only when the start
    date is ≥ 7 days out; inside 7 days the policy text with the contact email shows instead.
  - **Admin `/admin` (calendar/list):** the booking appears in the same pending state.

### A2. Admin confirm
- **Actor:** Admin — **Screen:** `/admin` → open booking → `BookingViewModal` — **Action:** confirm the
  booking (status → `confirmed`).
- **Expected:**
  - **Admin modal:** status badge → **Confirmed** (green). The **Fulfilment** section lists the
    delivery task as **Scheduled** (and a pickup task if the model created one). The **Invoice &
    Documents** section shows the assigned **Invoice Number** (`INV-YYYY-NNNN`, minted idempotently) and
    an *"Invoice opens once the balance is fully paid"* note.
  - **Customer dashboard:** status badge flips to **Confirmed** on next load / refetch.

### A3. Record payment — partial, then full
- **Actor:** Admin (or Accounting) — **Screen:** `BookingViewModal` → **Payments** section — **Action:**
  *Add payment* for **half** the total; then *Add payment* for the remainder.
- **Expected after the partial payment:**
  - **Payments section:** ledger row appears; Totals show Paid = half, Outstanding = half; payment badge
    → **Partial** (amber).
  - **Admin bookings list** (`['bookings']` invalidated by `useRecordBookingPayment`): the booking's
    payment badge reflects **Partial**.
  - **Customer dashboard** (`['customer-bookings']` now invalidated too): payment badge → **Partial**.
- **Expected after the full payment:**
  - **Payments section / all payment badges:** → **Paid** (green), Outstanding = $0.
  - The full-payment path issues the **invoice snapshot** (`issue_booking_invoice`) and the
    `send-invoice-email`; **Invoice & Documents → Open invoice** now navigates to a live invoice.
  - **Customer dashboard:** payment badge → **Paid**, and a **View Invoice** link appears on the card.

### A4. Open / print the invoice
- **Actor:** Admin/Accounting (authorized) — **Screen:** `BookingViewModal` → **Open invoice**, or
  `/invoice/<bookingId>` — **Action:** view, then **Download PDF**.
- **Expected:**
  - Invoice header shows **Invoice #INV-YYYY-NNNN** (not the `TLA-xxxx` fallback) — assigned
    automatically on open via `get_or_assign_invoice_number`, no manual step. Re-opening shows the **same**
    number (idempotent).
  - **Download PDF** waits for the number to settle before printing, so the PDF carries the real number.
  - A Customer opening their own `/invoice/<id>` sees the number too (RPC is a no-op for them; they read
    the already-assigned value), and never hits an authorization error.

### A5. Driver delivers
- **Actor:** Driver — **Screen:** `/driver-dashboard` (`DriverTasks`) — **Action:** on the delivery task:
  *Start* (en route) → set/confirm ETA → *Arrived* → complete with signature (`DeliveryProofDialog`).
- **Expected:**
  - **Driver screen:** task badge steps **Scheduled → Driver Underway → Arrived → Completed**; a delivery
    slip/receipt is generated; a tracking email is sent.
  - **Customer dashboard "Track Your Delivery":** the live task mirrors the same badge; while en route it
    shows *"Driver is on the way!"*, on arrival *"Driver has arrived"*, plus a **Track Delivery** link.
  - **Admin modal → Fulfilment:** delivery task shows **Completed** with its completion time. Booking
    status advances `out_for_delivery → delivered`.

### A6. Driver collects (end of rental)
- **Actor:** Driver — **Screen:** `/driver-dashboard` — **Action:** on the pickup task in en route/arrived,
  *Complete Collection* → sign (`CollectionProofDialog`), add condition notes.
- **Expected:**
  - **Driver screen:** pickup task → **Completed**; a signed collection receipt (`COL-…`) is created and a
    receipt email is sent.
  - **Admin modal → Fulfilment:** pickup task → **Completed**. Booking status → `completed`.
  - **Customer dashboard:** the delivery/pickup card drops out of *active* deliveries (only non-terminal
    tasks with a tracking token remain), and the booking card shows **Completed**.

### A7. Credit note
- **Actor:** Accounting — **Screen:** `/accounting` → **Credit Notes** panel — **Action:** search the
  booking, *Issue credit note* for an amount ≤ remaining creditable, with a reason.
- **Expected:**
  - **Credit Notes panel:** new **CN-YYYY-NNNN** row; amount over the remaining creditable is rejected.
  - **Invoice view** (`/invoice/<id>`) and **Admin modal → Invoice & Documents:** the credit note is
    listed (`-$amount`) with a **Balance After Credits** / **Total credited** line.

### A8. Completed (final state)
- **Expected across dashboards:** booking status **Completed** everywhere; payment **Paid**; fulfilment
  both **Completed**; invoice carries its INV number and any credit notes. No dashboard shows a blank
  pane, a bare spinner, or a dead button for this booking.

---

## Part B — Self-pickup variant (depot instead of driver)

Reserve as in A1 but choose **self-pickup** (no delivery address); confirm + pay as in A2–A4. Then:

### B5. Depot hand-over
- **Actor:** StoreStaff — **Screen:** `/depot` — **Action:** find the booking by **pickup code** (type or
  **Scan QR**) → *Hand Over* (`HandoverDialog`).
- **Expected:**
  - **Depot list:** the card's next-action badge is **Awaiting hand-over** (amber) before, and the card
    leaves the "awaiting hand-over" set after completion. Works offline — the action queues and the
    offline banner shows a pending count; **Sync now** (or reconnecting) drains the queue **and refreshes
    the visible list**.
  - **Admin modal → Fulfilment:** the pickup/hand-over task reflects completion.

### B6. Depot return
- **Actor:** StoreStaff — **Screen:** `/depot` — **Action:** locate the booking (now **Awaiting return**,
  emerald) → *Check In Return* (`ReturnDialog`).
- **Expected:**
  - **Depot list:** the booking clears from the active pickups list.
  - **Admin modal / Customer dashboard:** booking status → `completed`.

### B7–B8. Invoice + credit note + completed
- Same as A4/A7/A8.

---

## Cross-cutting checks (run once, any booking)

1. **Customer self-service reflects to admin:** as Customer, **Cancel** a booking (≥7 days out) via the
   confirmation dialog → toast confirms; the card shows **Cancelled** (red). In the **admin list**
   (open in another tab) the booking flips to cancelled without a manual refresh
   (`['bookings']` is now invalidated by the self-service mutations).
2. **Reschedule reflects to admin:** as Customer, **Change dates** → the booking returns to
   **Pending Admin Review** with a fresh hold; the admin list shows the new dates/state. Unavailable
   dates surface a per-item conflict message instead of updating.
3. **Empty states:** a brand-new customer sees *"You have no bookings yet."*; an empty depot shows
   *"No active self-pickup bookings at this time."*; a driver with nothing shows the "No tasks" copy —
   never a blank pane.
4. **Loading:** entering any protected dashboard shows the shared `PageSkeleton`; the customer dashboard
   shows card skeletons, not a text spinner.
5. **No dead ends:** every button either acts or is correctly hidden by role/state. The debug
   `AdminSidebarDebug` component is not wired into any nav and must not be reachable in prod.

---

## Known gaps to route to a **feature** agent (not cohesion)

- **W4 ledger ↔ W5 invoice snapshot:** the invoice **snapshot row** (`invoices`) is created only by the
  legacy full-payment path (`issue_booking_invoice` in `BookingsList` / the Stripe webhook), **not** by
  the W4 reconciliation RPC `record_booking_payment`. A booking driven to *paid* purely through the W4
  ledger can therefore have an INV **number** (assigned by `get_or_assign_invoice_number`) but **no
  snapshot**, so `/invoice/<id>` shows "Invoice not found". The **Open invoice** links (admin + customer)
  are gated on successful payment to match existing behaviour, but reconciling snapshot creation into the
  ledger path needs a feature/SQL change (out of cohesion scope).
- **Customer live task sync:** driver/depot task changes reach the customer dashboard on refetch
  (1-min staleTime), not via realtime — acceptable for now; a realtime subscription would be a feature add.
