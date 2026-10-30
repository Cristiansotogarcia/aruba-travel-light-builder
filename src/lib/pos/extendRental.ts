// Pure validation for the counter's "extend a rental" action. Mirrors the
// server-side guard in extend_booking_rental (migration
// 20261029210000_pos_phase2_counter_ops.sql): the new end date must be a
// real date strictly after the booking's current end date. The RPC is
// authoritative (it also re-checks stock and reprices); this only blocks an
// obviously invalid pick before the round trip.
//
// Dates are 'YYYY-MM-DD' calendar days, compared through parseDateOnly so
// this never hits the UTC-midnight-vs-Aruba-local pitfall documented in
// src/lib/dateOnly.ts (new Date('YYYY-MM-DD') parses as UTC).
import { parseDateOnly } from '@/lib/dateOnly';

export interface ExtendValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateExtensionDate(currentEndDate: string, newEndDate: string): ExtendValidationResult {
  if (!newEndDate) {
    return { valid: false, error: 'Pick a new end date.' };
  }

  const current = parseDateOnly(currentEndDate).getTime();
  const next = parseDateOnly(newEndDate).getTime();

  if (Number.isNaN(current) || Number.isNaN(next)) {
    return { valid: false, error: 'Invalid date.' };
  }

  if (next <= current) {
    return { valid: false, error: 'The new end date must be after the current end date.' };
  }

  return { valid: true, error: null };
}

/** Whole extra nights the extension adds, for display only (server reprices independently). */
export function extensionNightsAdded(currentEndDate: string, newEndDate: string): number {
  const current = parseDateOnly(currentEndDate).getTime();
  const next = parseDateOnly(newEndDate).getTime();
  if (Number.isNaN(current) || Number.isNaN(next) || next <= current) return 0;
  return Math.round((next - current) / (1000 * 60 * 60 * 24));
}
