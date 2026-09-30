import { describe, expect, it } from 'vitest';
import { assertValidImageFile, friendlySaveError, isUniqueSlugViolation } from './blogAdminApi';

const makeFile = (type: string, size: number, name = 'photo.jpg') => {
  const file = new File([new Uint8Array(size)], name, { type });
  return file;
};

describe('isUniqueSlugViolation', () => {
  it('recognizes a Postgres unique-violation error object', () => {
    expect(isUniqueSlugViolation({ code: '23505', message: 'duplicate key' })).toBe(true);
  });

  it('rejects other Postgres error codes', () => {
    expect(isUniqueSlugViolation({ code: '23503', message: 'fk violation' })).toBe(false);
  });

  it('rejects non-error values without throwing', () => {
    expect(isUniqueSlugViolation(null)).toBe(false);
    expect(isUniqueSlugViolation(undefined)).toBe(false);
    expect(isUniqueSlugViolation('boom')).toBe(false);
    expect(isUniqueSlugViolation(42)).toBe(false);
  });
});

describe('friendlySaveError', () => {
  it('gives a slug-specific message for a unique violation', () => {
    expect(friendlySaveError({ code: '23505' })).toBe(
      'That slug is already in use by another post. Choose a different one.',
    );
  });

  it('surfaces a real Error message for anything else', () => {
    expect(friendlySaveError(new Error('network down'))).toBe('network down');
  });

  it('falls back to a generic message for a non-Error, non-unique-violation value', () => {
    expect(friendlySaveError('nope')).toBe('Something went wrong while saving.');
  });
});

describe('assertValidImageFile', () => {
  it('accepts an allowed type under the size cap', () => {
    expect(() => assertValidImageFile(makeFile('image/png', 1024))).not.toThrow();
  });

  it('rejects a disallowed mime type', () => {
    expect(() => assertValidImageFile(makeFile('application/pdf', 1024, 'doc.pdf'))).toThrow(
      /JPEG, PNG, WebP, GIF, or AVIF/,
    );
  });

  it('rejects a file over 10MB even with an allowed type', () => {
    const tooBig = makeFile('image/jpeg', 10 * 1024 * 1024 + 1);
    expect(() => assertValidImageFile(tooBig)).toThrow(/10MB or smaller/);
  });

  it('accepts a file exactly at the 10MB cap', () => {
    const atCap = makeFile('image/jpeg', 10 * 1024 * 1024);
    expect(() => assertValidImageFile(atCap)).not.toThrow();
  });
});
