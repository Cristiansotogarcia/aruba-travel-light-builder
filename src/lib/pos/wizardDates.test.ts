import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { areWizardDatesValid, defaultWizardEndDate } from './wizardDates';

// Aruba is UTC-4 with no DST, which is exactly where `new Date('YYYY-MM-DD')`
// lands a day early. Pin it so these tests fail on the old parse wherever they run.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/Aruba';
});
afterAll(() => {
  process.env.TZ = originalTz;
});

describe('defaultWizardEndDate', () => {
  it('is the local calendar day after `now`', () => {
    expect(defaultWizardEndDate(new Date(2026, 9, 22, 10, 0))).toBe('2026-10-23');
  });

  it('rolls over a month boundary', () => {
    expect(defaultWizardEndDate(new Date(2026, 9, 31, 10, 0))).toBe('2026-11-01');
  });

  it('rolls over a year boundary', () => {
    expect(defaultWizardEndDate(new Date(2026, 11, 31, 10, 0))).toBe('2027-01-01');
  });

  it('does not shift a day late in the evening, where the old UTC-parse bug would show up', () => {
    // 23:30 local on Oct 22 is already Oct 23 in UTC; the old
    // `format(addDays(new Date(), 1), 'yyyy-MM-dd')` used the local `now`
    // directly (fine here), but reading it back through `new Date(str)`
    // elsewhere in the component is exactly the bug dateOnly.ts replaces.
    expect(defaultWizardEndDate(new Date(2026, 9, 22, 23, 30))).toBe('2026-10-23');
  });
});

describe('areWizardDatesValid', () => {
  it('is valid when end is strictly after start', () => {
    expect(areWizardDatesValid('2026-10-22', '2026-10-23')).toBe(true);
    expect(areWizardDatesValid('2026-10-22', '2026-11-05')).toBe(true);
  });

  it('is invalid when end equals start', () => {
    expect(areWizardDatesValid('2026-10-22', '2026-10-22')).toBe(false);
  });

  it('is invalid when end is before start', () => {
    expect(areWizardDatesValid('2026-10-23', '2026-10-22')).toBe(false);
  });

  it('is invalid when either date is missing', () => {
    expect(areWizardDatesValid('', '2026-10-23')).toBe(false);
    expect(areWizardDatesValid('2026-10-22', '')).toBe(false);
    expect(areWizardDatesValid('', '')).toBe(false);
  });

  it('is not thrown off by the UTC-parse bug across a month boundary', () => {
    // new Date('2026-11-01') > new Date('2026-10-31') is true in UTC too, so
    // this case alone would not have caught the bug - included for
    // completeness alongside the exact-boundary cases above.
    expect(areWizardDatesValid('2026-10-31', '2026-11-01')).toBe(true);
  });
});
