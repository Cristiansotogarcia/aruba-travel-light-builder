import { describe, it, expect } from 'vitest';
import { validateRefundAmount } from './refund';

describe('validateRefundAmount (mirrors create_credit_note SQL)', () => {
  it('rejects a zero or negative amount', () => {
    expect(validateRefundAmount(0, 100, 0, 'damaged item').valid).toBe(false);
    expect(validateRefundAmount(-5, 100, 0, 'damaged item').valid).toBe(false);
  });

  it('rejects a non-finite amount', () => {
    expect(validateRefundAmount(Number.NaN, 100, 0, 'damaged item').valid).toBe(false);
  });

  it('requires a reason', () => {
    const result = validateRefundAmount(20, 100, 0, '   ');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/reason is required/i);
  });

  it('accepts an amount within the remaining creditable total', () => {
    const result = validateRefundAmount(50, 100, 0, 'Cancelled early');
    expect(result.valid).toBe(true);
    expect(result.remaining).toBe(100);
  });

  it('rejects an amount exceeding the booking total', () => {
    const result = validateRefundAmount(150, 100, 0, 'Cancelled early');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exceeds the remaining creditable amount/i);
  });

  it('accounts for credits already issued against the booking', () => {
    const result = validateRefundAmount(60, 100, 50, 'Second refund');
    expect(result.valid).toBe(false);
    expect(result.remaining).toBe(50);
  });

  it('allows an amount that exactly matches the remaining creditable total', () => {
    const result = validateRefundAmount(50, 100, 50, 'Final refund');
    expect(result.valid).toBe(true);
    expect(result.remaining).toBe(50);
  });

  it('tolerates floating point cent rounding at the boundary', () => {
    const result = validateRefundAmount(33.34, 100, 66.66, 'Rounding check');
    expect(result.valid).toBe(true);
  });
});
