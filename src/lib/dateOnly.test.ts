import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  daysBetween,
  formatDateOnly,
  isSundayDateOnly,
  parseDateOnly,
  toDateOnly,
  todayDateOnly,
} from './dateOnly';

// Aruba is UTC-4 with no DST, which is exactly where `new Date('YYYY-MM-DD')`
// lands a day early. Pin it so these tests fail on the old parse wherever they run.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/Aruba';
});
afterAll(() => {
  process.env.TZ = originalTz;
});

describe('parseDateOnly', () => {
  it('keeps the calendar day of a YYYY-MM-DD string', () => {
    const d = parseDateOnly('2026-10-22');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(22);
    expect(d.getHours()).toBe(0);
  });

  it('documents the bug it replaces: native parsing shifts back one day in Aruba', () => {
    expect(new Date('2026-10-22').getDate()).toBe(21);
  });

  it('handles month and year boundaries', () => {
    expect(toDateOnly(parseDateOnly('2026-01-01'))).toBe('2026-01-01');
    expect(toDateOnly(parseDateOnly('2026-12-31'))).toBe('2026-12-31');
  });

  it('returns a Date unchanged and parses full timestamps as instants', () => {
    const now = new Date();
    expect(parseDateOnly(now)).toBe(now);
    expect(parseDateOnly('2026-10-22T12:00:00Z').toISOString()).toBe('2026-10-22T12:00:00.000Z');
  });
});

describe('toDateOnly / todayDateOnly', () => {
  it('uses the local day, not the UTC day', () => {
    // 21:30 in Aruba is 01:30 UTC the next day.
    const lateEvening = new Date(2026, 9, 22, 21, 30);
    expect(lateEvening.toISOString().slice(0, 10)).toBe('2026-10-23');
    expect(toDateOnly(lateEvening)).toBe('2026-10-22');
    expect(todayDateOnly(lateEvening)).toBe('2026-10-22');
  });

  it('round-trips with parseDateOnly', () => {
    expect(toDateOnly(parseDateOnly('2026-02-28'))).toBe('2026-02-28');
  });
});

describe('formatDateOnly', () => {
  it('prints the same day that was stored', () => {
    expect(formatDateOnly('2026-10-22', 'en-US', { month: 'long', day: 'numeric' })).toBe('October 22');
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-10-22', '2026-10-22')).toBe(0);
    expect(daysBetween('2026-10-22', '2026-10-27')).toBe(5);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2026-10-27', '2026-10-22')).toBe(-5);
  });

  it('is not thrown off by a DST change in other zones', () => {
    process.env.TZ = 'America/New_York';
    try {
      expect(daysBetween('2026-11-01', '2026-11-02')).toBe(1);
      expect(daysBetween('2026-03-08', '2026-03-09')).toBe(1);
    } finally {
      process.env.TZ = 'America/Aruba';
    }
  });
});

describe('isSundayDateOnly', () => {
  it('reads the weekday of the stored day', () => {
    expect(isSundayDateOnly('2026-10-25')).toBe(true);
    expect(isSundayDateOnly('2026-10-24')).toBe(false);
    expect(isSundayDateOnly('2026-10-26')).toBe(false);
  });
});
