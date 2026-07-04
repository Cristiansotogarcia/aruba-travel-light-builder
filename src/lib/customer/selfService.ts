// Customer self-service eligibility (W6).
//
// Business rule: a customer may cancel or reschedule their own booking only
// when the rental start_date is at least SELF_SERVICE_MIN_DAYS whole calendar
// days away. Inside that window changes are staff-only (info@travelightaruba.com).
//
// This mirrors — but does not replace — the SQL enforcement inside
// customer_cancel_booking / customer_reschedule_booking. The client uses it
// only to decide whether to show the buttons.

import { parseISO, isValid } from 'date-fns';

export const SELF_SERVICE_MIN_DAYS = 7;

const MS_PER_DAY = 86_400_000;

/**
 * Whole calendar days from `now`'s UTC calendar day to the booking start day.
 * Positive = start is in the future; 0 = starts today; negative = past.
 * Returns NaN for malformed date strings.
 *
 * UTC-day math mirrors the SQL rule (`start_date - CURRENT_DATE` on a UTC
 * server) and the convention in src/lib/rentalDates.ts, so the button
 * visibility can't disagree with the database because of the browser timezone.
 */
export function daysUntilStart(startDate: string, now: Date = new Date()): number {
  const start = parseISO(startDate); // local midnight of the named calendar day
  if (!isValid(start)) return NaN;
  const startEpoch = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const todayEpoch = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((startEpoch - todayEpoch) / MS_PER_DAY);
}

/**
 * Statuses a customer may still cancel/reschedule themselves.
 * Mirrors the status gate in customer_cancel_booking / customer_reschedule_booking.
 */
export const SELF_SERVICEABLE_STATUSES = ['pending', 'pending_admin_review', 'confirmed'] as const;

export function isSelfServiceableStatus(status: string): boolean {
  return (SELF_SERVICEABLE_STATUSES as readonly string[]).includes(status);
}

/**
 * True when the booking start is at least SELF_SERVICE_MIN_DAYS calendar days
 * away, i.e. the customer may cancel/reschedule it themselves.
 */
export function isSelfServiceEligible(startDate: string, now: Date = new Date()): boolean {
  const days = daysUntilStart(startDate, now);
  return Number.isFinite(days) && days >= SELF_SERVICE_MIN_DAYS;
}

export const CONTACT_EMAIL = 'info@travelightaruba.com';

const POLICY_MESSAGE =
  `Bookings can only be changed or cancelled online up to 7 days before the rental start. ` +
  `Please contact us at ${CONTACT_EMAIL} and we'll help you out.`;

/**
 * Translates the raw error message from customer_cancel_booking /
 * customer_reschedule_booking into customer-friendly copy.
 */
export function describeSelfServiceError(message: string): string {
  if (message.includes('CANCELLATION_WINDOW_CLOSED') || message.includes('RESCHEDULE_WINDOW_CLOSED')) {
    return POLICY_MESSAGE;
  }
  if (message.includes('BOOKING_NOT_FOUND')) {
    return "We couldn't find that booking on your account.";
  }
  if (message.includes('NOT_CANCELLABLE') || message.includes('NOT_RESCHEDULABLE')) {
    return 'This booking can no longer be changed online.';
  }
  if (message.includes('DATES_UNCHANGED')) {
    return 'Those are the current dates — pick different ones.';
  }
  if (message.includes('INVALID_DATES')) {
    return 'Those dates are not valid for a rental. Please pick a new range.';
  }
  if (message.includes('NOT_AUTHENTICATED')) {
    return 'Please sign in again to manage your booking.';
  }
  return 'Something went wrong. Please try again or contact us.';
}
