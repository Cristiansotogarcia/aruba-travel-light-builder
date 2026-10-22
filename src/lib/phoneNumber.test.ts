import { describe, expect, it } from 'vitest';
import {
  ALL_COUNTRY_CODES,
  composeE164,
  DEFAULT_DIAL_CODE,
  isValidE164Phone,
  splitE164,
} from './phoneNumber';

describe('composeE164', () => {
  it('joins the dial code and digits with no separator', () => {
    expect(composeE164('+297', '5551234')).toBe('+2975551234');
  });

  it('strips spaces, dashes and parens from the local number', () => {
    expect(composeE164('+1', '(555) 123-4567')).toBe('+15551234567');
  });

  it('returns an empty string when the local number has no digits', () => {
    expect(composeE164('+297', '')).toBe('');
    expect(composeE164('+1', ' - ')).toBe('');
  });
});

describe('splitE164', () => {
  it('splits a composed Aruba number back into dial code and digits', () => {
    expect(splitE164('+2975551234')).toEqual({ dial: '+297', local: '5551234' });
  });

  it('prefers the longest matching dial code over a shorter prefix', () => {
    // +1876 (Jamaica) must win over +1 (US/Canada) for the same leading digit.
    expect(splitE164('+18765551234')).toEqual({ dial: '+1876', local: '5551234' });
    expect(splitE164('+15551234567')).toEqual({ dial: '+1', local: '5551234567' });
  });

  it('defaults to the Aruba dial code for a value with no + prefix', () => {
    expect(splitE164('5551234')).toEqual({ dial: DEFAULT_DIAL_CODE, local: '5551234' });
  });

  it('defaults to the Aruba dial code for an empty value', () => {
    expect(splitE164('')).toEqual({ dial: DEFAULT_DIAL_CODE, local: '' });
  });

  it('falls back to the Aruba dial code for an unrecognized country prefix', () => {
    expect(splitE164('+9999999')).toEqual({ dial: DEFAULT_DIAL_CODE, local: '9999999' });
  });

  it('round-trips every dial code in the list through compose/split', () => {
    for (const country of ALL_COUNTRY_CODES) {
      const composed = composeE164(country.dial, '5551234');
      expect(splitE164(composed).dial).toBe(country.dial);
    }
  });
});

describe('isValidE164Phone', () => {
  it('accepts a composed Aruba number', () => {
    expect(isValidE164Phone('+2975551234')).toBe(true);
  });

  it('accepts a number with formatting characters stripped before validation', () => {
    expect(isValidE164Phone('+1 (555) 123-4567')).toBe(true);
  });

  it('rejects an empty or whitespace-only value', () => {
    expect(isValidE164Phone('')).toBe(false);
    expect(isValidE164Phone('   ')).toBe(false);
  });

  it('rejects a value that starts with 0 after the country code', () => {
    expect(isValidE164Phone('+0123456')).toBe(false);
  });

  it('rejects a value with letters', () => {
    expect(isValidE164Phone('+297abc1234')).toBe(false);
  });

  it('rejects a value exceeding 16 total digits', () => {
    expect(isValidE164Phone('+12345678901234567')).toBe(false);
  });
});
