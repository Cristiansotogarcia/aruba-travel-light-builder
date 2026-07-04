import { describe, it, expect } from 'vitest';
import {
  computeInclusiveTax,
  formatInvoiceNumber,
  formatCreditNumber,
  parseTaxRate,
} from './invoice';

describe('computeInclusiveTax', () => {
  it('returns zero tax when rate is 0', () => {
    const r = computeInclusiveTax(100, 0);
    expect(r.taxAmount).toBe(0);
    expect(r.netAmount).toBe(100);
    expect(r.grossAmount).toBe(100);
  });

  it('extracts tax embedded in a tax-inclusive total (6%)', () => {
    // gross = net * 1.06 => net = 100 / 1.06 = 94.339623..., tax = 5.66
    const r = computeInclusiveTax(100, 6);
    expect(r.grossAmount).toBe(100);
    expect(r.taxAmount).toBeCloseTo(5.66, 2);
    expect(r.netAmount).toBeCloseTo(94.34, 2);
    // net + tax must reconstruct gross exactly after rounding
    expect(r.netAmount + r.taxAmount).toBeCloseTo(100, 2);
  });

  it('handles a whole-number example cleanly (rate 25 on 125)', () => {
    // net 100 + 25% = 125 gross; extracting: tax = 125 - 125/1.25 = 25
    const r = computeInclusiveTax(125, 25);
    expect(r.taxAmount).toBeCloseTo(25, 2);
    expect(r.netAmount).toBeCloseTo(100, 2);
  });

  it('rounds to two decimals', () => {
    const r = computeInclusiveTax(99.99, 6);
    expect(Number.isInteger(r.taxAmount * 100)).toBe(true);
    expect(Number.isInteger(r.netAmount * 100)).toBe(true);
  });

  it('treats negative or zero totals as no tax', () => {
    expect(computeInclusiveTax(0, 6).taxAmount).toBe(0);
    expect(computeInclusiveTax(-50, 6).taxAmount).toBe(0);
  });

  it('treats negative rate as no tax', () => {
    expect(computeInclusiveTax(100, -3).taxAmount).toBe(0);
  });
});

describe('parseTaxRate', () => {
  it('parses numeric strings', () => {
    expect(parseTaxRate('6')).toBe(6);
    expect(parseTaxRate('6.5')).toBe(6.5);
  });
  it('defaults invalid/empty to 0', () => {
    expect(parseTaxRate('')).toBe(0);
    expect(parseTaxRate('abc')).toBe(0);
    expect(parseTaxRate(undefined)).toBe(0);
    expect(parseTaxRate(null)).toBe(0);
  });
  it('clamps negatives to 0', () => {
    expect(parseTaxRate('-5')).toBe(0);
  });
});

describe('formatInvoiceNumber', () => {
  it('formats sequence + year as INV-YYYY-NNNN with zero padding', () => {
    expect(formatInvoiceNumber(2026, 1)).toBe('INV-2026-0001');
    expect(formatInvoiceNumber(2026, 42)).toBe('INV-2026-0042');
    expect(formatInvoiceNumber(2026, 1234)).toBe('INV-2026-1234');
  });

  it('does not truncate sequences beyond 4 digits', () => {
    expect(formatInvoiceNumber(2026, 12345)).toBe('INV-2026-12345');
  });
});

describe('formatCreditNumber', () => {
  it('formats sequence + year as CN-YYYY-NNNN with zero padding', () => {
    expect(formatCreditNumber(2026, 1)).toBe('CN-2026-0001');
    expect(formatCreditNumber(2026, 7)).toBe('CN-2026-0007');
  });
});
