import { describe, it, expect } from 'vitest';
import { validateExtensionDate, extensionNightsAdded } from './extendRental';

describe('validateExtensionDate (mirrors extend_booking_rental SQL)', () => {
  it('rejects an empty new end date', () => {
    const result = validateExtensionDate('2026-11-01', '');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/pick a new end date/i);
  });

  it('rejects a new end date equal to the current end date', () => {
    const result = validateExtensionDate('2026-11-01', '2026-11-01');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/after the current end date/i);
  });

  it('rejects a new end date before the current end date', () => {
    const result = validateExtensionDate('2026-11-01', '2026-10-30');
    expect(result.valid).toBe(false);
  });

  it('accepts a new end date after the current end date', () => {
    const result = validateExtensionDate('2026-11-01', '2026-11-03');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('is not fooled by the UTC-midnight-vs-Aruba-local parsing pitfall (dateOnly)', () => {
    // Both are calendar-day strings one day apart; a naive `new Date(...)`
    // comparison in a UTC-4 timezone can read these as equal. parseDateOnly
    // must keep them distinct.
    const result = validateExtensionDate('2026-10-29', '2026-10-30');
    expect(result.valid).toBe(true);
  });

  it('rejects an invalid date string', () => {
    const result = validateExtensionDate('2026-11-01', 'not-a-date');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid date/i);
  });
});

describe('extensionNightsAdded', () => {
  it('counts whole nights added', () => {
    expect(extensionNightsAdded('2026-11-01', '2026-11-04')).toBe(3);
  });

  it('is 0 when the new end date does not extend forward', () => {
    expect(extensionNightsAdded('2026-11-01', '2026-11-01')).toBe(0);
    expect(extensionNightsAdded('2026-11-01', '2026-10-29')).toBe(0);
  });
});
