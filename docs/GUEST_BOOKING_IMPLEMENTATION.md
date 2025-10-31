# Guest Booking System Implementation

## Overview
This document tracks the implementation of the guest booking system that allows users to make reservations without login, with admin confirmation and payment link generation.

## Implementation Status

### ✅ Phase 1: Database Schema (COMPLETED)
**File**: `supabase/migrations/20250131000000_guest_booking_system.sql`

Created:
- `delivery_slots` table - Tracks 2 time slots per day (morning/afternoon) with 3 booking limit each
- `admin_notifications` table - Stores notifications for admin users
- Added columns to `bookings`:
  - `delivery_slot` (morning/afternoon)
  - `admin_confirmed_at`, `admin_confirmed_by`
  - `payment_link_url`, `payment_link_generated_at`, `payment_link_expires_at`
  - `reservation_email_sent_at`
  - `rejection_reason`, `rejected_at`, `rejected_by`
- Made `user_id` nullable in bookings for guest bookings
- Created database functions:
  - `check_delivery_slot_availability()` - Check if slot is available
  - `update_delivery_slot_counter()` - Auto-update slot counters
  - `create_new_reservation_notification()` - Create admin notification
  - `get_delivery_slots_availability()` - Get availability for date range
- Updated RLS policies to allow guest bookings
- Created triggers for automatic slot management

### ✅ Phase 2: TypeScript Types (COMPLETED)
**File**: `src/types/types.ts`

Updated:
- Added `deliverySlot?: 'morning' | 'afternoon'` to `BookingFormData`

### ✅ Phase 3: Guest Booking Flow (COMPLETED)
**File**: `src/hooks/useBooking.ts`

Changes:
- Removed authentication requirement (`user` check)
- Changed initial booking status to `'pending_admin_review'`
- Removed immediate payment session creation
- Removed stock reservation from booking creation (will be done at admin confirmation)
- Added delivery slot validation
- Integrated reservation email sending
- Updated success message to inform users about admin review process

### ✅ Phase 4: Reservation Email (COMPLETED)
**File**: `supabase/functions/send-reservation-email/index.ts`

Created Edge Function that:
- Sends beautifully formatted HTML reservation confirmation email
- Includes booking reference, items, dates, delivery slot, total amount
- Explains next steps (admin review → payment link → delivery)
- Handles gracefully when RESEND_API_KEY not configured (logs to console)

---

## 🚧 Remaining Implementation Tasks

### Phase 5: Delivery Slot Selector UI
**Files to modify**: 
- `src/components/booking/BookingForm.tsx`
- `src/components/booking/DateSelection.tsx` (or create new DeliverySlotSelector.tsx)

Tasks:
- [ ] Add delivery slot selector (radio buttons or dropdown for Morning/Afternoon)
- [ ] Show slot availability indicators (e.g., "2 slots remaining")
- [ ] Disable full slots
- [ ] Integrate with `check_delivery_slot_availability` function
- [ ] Add visual feedback for selected slot

### Phase 6: Admin Confirmation Workflow
**Files to create/modify**:
- Create: `src/components/admin/BookingConfirmationModal.tsx`
- Create: `src/components/admin/PendingReservations.tsx`
- Modify: `src/components/admin/BookingsList.tsx`

Tasks:
- [ ] Add "Pending Admin Review" filter/tab in BookingsList
- [ ] Create confirmation modal with:
  - Full booking details review
  - Inventory availability check
  - Delivery slot change option (if needed)
  - Admin notes field
  - Confirm/Reject buttons
- [ ] Implement confirmation logic:
  - Reserve stock
  - Generate payment link
  - Send payment link email
  - Update booking status
  - Log admin action
- [ ] Implement rejection logic:
  - Send rejection email
  - Update booking status
  - Log admin action

### Phase 7: Payment Link Generation
**File to create**: `supabase/functions/generate-payment-link/index.ts`

Tasks:
- [ ] Create Edge Function that:
  - Generates Stripe payment session
  - Stores payment link in booking record
  - Sends payment link email to customer
  - Sets link expiry (optional)

### Phase 8: Admin Notification System
**Files to create**:
- `src/components/admin/AdminNotificationBell.tsx`
- `src/hooks/useAdminNotifications.ts`

Tasks:
- [ ] Create notification bell icon component
- [ ] Show unread count badge
- [ ] Dropdown with recent notifications
- [ ] Mark as read functionality
- [ ] Real-time updates via Supabase subscriptions
- [ ] Link to relevant booking from notification

### Phase 9: Stock Reservation Update
**Files to modify**:
- Confirmation logic in admin components
- Possibly `useBooking.ts` cleanup

Tasks:
- [ ] Ensure stock is ONLY reserved when admin confirms
- [ ] Add stock availability check in confirmation modal
- [ ] Handle stock shortage scenarios
- [ ] Release stock on booking cancellation/rejection

### Phase 10: Testing & Documentation
Tasks:
- [ ] Test guest booking flow (no login)
- [ ] Test delivery slot validation (3 per slot limit)
- [ ] Test reservation email sending
- [ ] Test admin notification creation
- [ ] Test admin confirmation workflow
- [ ] Test payment link generation and email
- [ ] Test stock reservation at confirmation
- [ ] Test rejection flow
- [ ] Document admin procedures
- [ ] Create user guide for booking process

---

## New Booking Status Flow

```
Guest makes reservation
    ↓
pending_admin_review (no payment, no stock reserved)
    ↓
Admin reviews → CONFIRM
    ↓
confirmed (stock reserved, payment link generated & sent)
    ↓
Customer pays
    ↓
payment_completed
    ↓
out_for_delivery → delivered → completed
```

**OR**

```
pending_admin_review
    ↓
Admin reviews → REJECT
    ↓
rejected (rejection email sent, no charges)
```

---

## Key Business Rules

1. **No Login Required**: Users can book as guests
2. **No Immediate Payment**: Payment link sent after admin confirmation
3. **3 Deliveries Per Slot**: Maximum 3 bookings per time slot per day
4. **2 Time Slots Per Day**: Morning (9AM-12PM) and Afternoon (1PM-5PM)
5. **Manual Admin Review**: All reservations require manual approval
6. **Stock Reserved at Confirmation**: Inventory only reduced when admin confirms
7. **Email Notifications**: 
   - Reservation confirmation to customer (immediate)
   - Admin notification (immediate)
   - Payment link to customer (after admin confirmation)

---

## Database Functions Available

```sql
-- Check if a slot is available for booking
SELECT * FROM check_delivery_slot_availability('2025-02-01', 'morning');

-- Get availability for date range
SELECT * FROM get_delivery_slots_availability('2025-02-01', '2025-02-28');
```

---

## Frontend Integration Points

### Booking Form
- Add delivery slot selector UI
- Call `check_delivery_slot_availability` when date is selected
- Validate slot availability before form submission

### Admin Dashboard  
- Filter bookings by `status = 'pending_admin_review'`
- Subscribe to `admin_notifications` table for real-time updates
- Implement confirmation/rejection actions

### Email Configuration
- Set `RESEND_API_KEY` environment variable in Supabase dashboard
- Configure sender email domain in Resend account

---

## Next Steps

1. **Run Database Migration**: Apply `20250131000000_guest_booking_system.sql` to add new tables and functions
2. **Add Delivery Slot UI**: Create slot selector in booking form
3. **Test Guest Booking**: Try creating a booking without login
4. **Implement Admin Workflow**: Build confirmation modal and pending reservations view
5. **Add Payment Link Generation**: Create Edge Function for generating Stripe links
6. **Full System Test**: Test complete flow from reservation to payment

---

## Notes

- The `pending_admin_review` status is NOT in the current BookingStatus type - need to add it
- Stock reservation functions (`reserve_equipment_stock`, `release_equipment_stock`) already exist from previous migration
- Payment session creation logic exists but needs to be moved to admin confirmation step
- Consider adding booking expiry logic (e.g., auto-cancel unconfirmed bookings after 48 hours)

---

## Migration Safety

Before applying the migration:
1. Backup your database
2. Test on development/staging environment first
3. The migration uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` for safety
4. Existing bookings will not be affected (user_id will remain NOT NULL for them)
5. RLS policies are updated but existing policies are dropped safely

---

Last Updated: January 31, 2025
Status: Phase 1-4 Complete (Database, Types, Booking Flow, Email)
Next: Phase 5 (Delivery Slot UI)
