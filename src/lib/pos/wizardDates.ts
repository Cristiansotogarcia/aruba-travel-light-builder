// Pure date helpers for PosWizard's rental step: the default end date and
// the start/end validity rule. Built on src/lib/dateOnly.ts so the wizard
// never goes through `new Date('YYYY-MM-DD')` (parses as UTC midnight, which
// in Aruba — UTC-4 — lands a day early; see dateOnly.ts's header) or
// date-fns' `addDays`/`format`, which carry the same instant-vs-calendar-day
// gap. No network/Supabase imports here on purpose: unit-tested in isolation
// (wizardDates.test.ts).

import { daysBetween, parseDateOnly, toDateOnly, todayDateOnly } from '@/lib/dateOnly';

/** Tomorrow's local calendar day as 'YYYY-MM-DD' — the wizard's default end date. */
export function defaultWizardEndDate(now: Date = new Date()): string {
  const tomorrow = parseDateOnly(todayDateOnly(now));
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateOnly(tomorrow);
}

/** Valid only when both dates are set and end is strictly after start. */
export function areWizardDatesValid(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;
  return daysBetween(startDate, endDate) > 0;
}
