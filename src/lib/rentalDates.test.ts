// src/lib/rentalDates.test.ts
import { describe, it, expect } from 'vitest';
import { parseRangeFromParams, isValidRange, MIN_NIGHTS } from './rentalDates';

describe('parseRangeFromParams', () => {
  it('reads start/end from URLSearchParams', () => {
    const p = new URLSearchParams('start=2027-01-10&end=2027-01-14');
    expect(parseRangeFromParams(p)).toEqual({ startDate: '2027-01-10', endDate: '2027-01-14' });
  });
  it('returns nulls when absent or malformed', () => {
    expect(parseRangeFromParams(new URLSearchParams(''))).toEqual({ startDate: null, endDate: null });
    expect(parseRangeFromParams(new URLSearchParams('start=nope'))).toEqual({ startDate: null, endDate: null });
  });
  it('rejects impossible dates', () => {
    expect(parseRangeFromParams(new URLSearchParams('start=2027-01-10&end=bad'))).toEqual({ startDate: '2027-01-10', endDate: null });
    expect(parseRangeFromParams(new URLSearchParams('start=2027-13-01'))).toEqual({ startDate: null, endDate: null });
  });
});

describe('isValidRange', () => {
  const today = new Date('2026-06-10T12:00:00.000Z');
  it('requires both dates, end >= start + MIN_NIGHTS, start not in the past', () => {
    expect(isValidRange('2027-01-10', '2027-01-13', today)).toBe(true);
    expect(isValidRange('2027-01-10', '2027-01-12', today)).toBe(false);
    expect(isValidRange('2020-01-10', '2020-01-20', today)).toBe(false);
    expect(isValidRange(null, '2027-01-13', today)).toBe(false);
  });
  it('MIN_NIGHTS matches the booking rule (3)', () => {
    expect(MIN_NIGHTS).toBe(3);
  });
  it('rejects null end date and impossible calendar days', () => {
    expect(isValidRange('2027-01-10', null, today)).toBe(false);
    expect(isValidRange('2027-02-30', '2027-03-10', today)).toBe(false);
  });
});
