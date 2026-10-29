// src/lib/specialRequests/specialRequestSchema.test.ts
import { describe, it, expect } from 'vitest';
import { specialRequestFormDefaults, specialRequestSchema } from './specialRequestSchema';

const validRequest = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+297 593-2028',
  request_type: 'special_arrangement' as const,
  message: 'Can you deliver a car seat to the car rental place?',
  preferred_dates: 'Dec 20 - Dec 27',
};

describe('specialRequestSchema', () => {
  it('accepts a fully filled-in request', () => {
    const result = specialRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('accepts the form defaults plus the required fields only (phone/preferred_dates optional)', () => {
    const result = specialRequestSchema.safeParse({
      ...specialRequestFormDefaults,
      name: 'Jane Doe',
      email: 'jane@example.com',
      request_type: 'general',
      message: 'Do you have an extra large beach umbrella?',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = specialRequestSchema.safeParse({ ...validRequest, name: '  ' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = specialRequestSchema.safeParse({ ...validRequest, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty message', () => {
    const result = specialRequestSchema.safeParse({ ...validRequest, message: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a request_type outside the allowed set', () => {
    const result = specialRequestSchema.safeParse({ ...validRequest, request_type: 'urgent' });
    expect(result.success).toBe(false);
  });

  it('rejects a message over 2000 characters (mirrors the DB CHECK constraint)', () => {
    const result = specialRequestSchema.safeParse({ ...validRequest, message: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('rejects a name over 100 characters (mirrors the DB CHECK constraint)', () => {
    const result = specialRequestSchema.safeParse({ ...validRequest, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});
