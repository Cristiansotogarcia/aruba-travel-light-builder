import { describe, it, expect } from 'vitest';
import {
  CONTACT_EMAIL,
  daysUntilStart,
  describeSelfServiceError,
  isSelfServiceEligible,
  isSelfServiceableStatus,
  SELF_SERVICE_MIN_DAYS,
} from './selfService';

// The self-service rule: a customer may cancel or reschedule their own booking
// only when the rental start is at least 7 whole days away. Inside 7 days it is
// staff-only. The date math is done on calendar days in UTC, matching the DB.

describe('daysUntilStart', () => {
  it('counts whole calendar days between "today" and the start date', () => {
    // 2026-07-04 -> 2026-07-11 is exactly 7 days
    expect(daysUntilStart('2026-07-11', new Date('2026-07-04T12:00:00Z'))).toBe(7);
  });

  it('ignores the time-of-day of "now" (uses the calendar day only)', () => {
    // Late in the day should not shave a day off the count.
    expect(daysUntilStart('2026-07-11', new Date('2026-07-04T23:59:59Z'))).toBe(7);
    expect(daysUntilStart('2026-07-11', new Date('2026-07-04T00:00:00Z'))).toBe(7);
  });

  it('returns 0 when the start date is today', () => {
    expect(daysUntilStart('2026-07-04', new Date('2026-07-04T08:00:00Z'))).toBe(0);
  });

  it('returns a negative number for a start date in the past', () => {
    expect(daysUntilStart('2026-07-01', new Date('2026-07-04T08:00:00Z'))).toBe(-3);
  });

  it('does not drift across a month boundary', () => {
    expect(daysUntilStart('2026-08-01', new Date('2026-07-25T00:00:00Z'))).toBe(7);
  });

  it('parses the ISO date as a plain calendar day, not a local Date', () => {
    // parseISO('YYYY-MM-DD') must not be affected by the runner timezone.
    expect(daysUntilStart('2026-12-31', new Date('2026-12-24T00:00:00Z'))).toBe(7);
  });

  it('returns NaN for a malformed date string', () => {
    expect(Number.isNaN(daysUntilStart('not-a-date', new Date('2026-07-04T00:00:00Z')))).toBe(true);
  });
});

describe('SELF_SERVICE_MIN_DAYS', () => {
  it('is 7 (mirrors the SQL rule)', () => {
    expect(SELF_SERVICE_MIN_DAYS).toBe(7);
  });
});

describe('isSelfServiceEligible', () => {
  it('is eligible at exactly 7 days before start', () => {
    expect(isSelfServiceEligible('2026-07-11', new Date('2026-07-04T12:00:00Z'))).toBe(true);
  });

  it('is eligible with more than 7 days lead time', () => {
    expect(isSelfServiceEligible('2026-08-01', new Date('2026-07-04T12:00:00Z'))).toBe(true);
  });

  it('is NOT eligible at 6 days before start (inside the window)', () => {
    expect(isSelfServiceEligible('2026-07-10', new Date('2026-07-04T12:00:00Z'))).toBe(false);
  });

  it('is NOT eligible the day before start', () => {
    expect(isSelfServiceEligible('2026-07-05', new Date('2026-07-04T12:00:00Z'))).toBe(false);
  });

  it('is NOT eligible when start is today', () => {
    expect(isSelfServiceEligible('2026-07-04', new Date('2026-07-04T12:00:00Z'))).toBe(false);
  });

  it('is NOT eligible for a past start date', () => {
    expect(isSelfServiceEligible('2026-06-01', new Date('2026-07-04T12:00:00Z'))).toBe(false);
  });

  it('is NOT eligible for a malformed date', () => {
    expect(isSelfServiceEligible('garbage', new Date('2026-07-04T12:00:00Z'))).toBe(false);
  });
});

describe('describeSelfServiceError', () => {
  it('maps the SQL window-closed errors to the contact-staff policy message', () => {
    const cancelMsg = describeSelfServiceError('CANCELLATION_WINDOW_CLOSED');
    const reschedMsg = describeSelfServiceError('RESCHEDULE_WINDOW_CLOSED');
    expect(cancelMsg).toContain(CONTACT_EMAIL);
    expect(reschedMsg).toContain(CONTACT_EMAIL);
    expect(cancelMsg).toContain('7 days');
  });

  it('maps ownership/lookup failures without leaking internals', () => {
    expect(describeSelfServiceError('BOOKING_NOT_FOUND')).toMatch(/find|found/i);
  });

  it('maps non-changeable statuses', () => {
    expect(describeSelfServiceError('NOT_CANCELLABLE: cancelled')).toMatch(/no longer/i);
    expect(describeSelfServiceError('NOT_RESCHEDULABLE: delivered')).toMatch(/no longer/i);
  });

  it('maps date validation errors', () => {
    expect(describeSelfServiceError('INVALID_DATES')).toMatch(/dates/i);
    expect(describeSelfServiceError('DATES_UNCHANGED')).toMatch(/different/i);
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(describeSelfServiceError('deadlock detected')).toMatch(/wrong|try again/i);
  });
});

describe('isSelfServiceableStatus', () => {
  it.each(['pending', 'pending_admin_review', 'confirmed'])(
    'allows %s (mirrors the SQL status gate)',
    (status) => {
      expect(isSelfServiceableStatus(status)).toBe(true);
    },
  );

  it.each(['cancelled', 'completed', 'delivered', 'out_for_delivery', 'in_transit', 'rejected', 'expired', 'undeliverable', ''])(
    'blocks %s',
    (status) => {
      expect(isSelfServiceableStatus(status)).toBe(false);
    },
  );
});
