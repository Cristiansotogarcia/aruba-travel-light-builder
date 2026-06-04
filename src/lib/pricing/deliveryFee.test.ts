// src/lib/pricing/deliveryFee.test.ts
import { describe, it, expect } from 'vitest';
import { computeDeliveryFee } from './deliveryFee';

describe('computeDeliveryFee', () => {
  it('is 0 for pickup regardless of dates/length', () => {
    expect(computeDeliveryFee('pickup', '2026-12-06', 2)).toBe(0); // Sunday + short
    expect(computeDeliveryFee('pickup', '2026-12-07', 7)).toBe(0);
  });
  it('charges $20 for a Sunday delivery start', () => {
    expect(computeDeliveryFee('delivery', '2026-12-06', 3)).toBe(20); // 2026-12-06 is a Sunday
  });
  it('charges $10 for a short (<5 day) delivery', () => {
    expect(computeDeliveryFee('delivery', '2026-12-07', 3)).toBe(10); // Monday, 3 days
  });
  it('is free for a 5+ day delivery', () => {
    expect(computeDeliveryFee('delivery', '2026-12-07', 5)).toBe(0);
  });
});
