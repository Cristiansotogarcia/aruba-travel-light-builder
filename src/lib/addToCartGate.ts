// src/lib/addToCartGate.ts
// Customers pick their rental dates before anything goes into the cart, so the
// cart only ever holds items that are actually free for those dates.
import { isValidRange } from '@/lib/rentalDates';

export type AddToCartGate =
  | { ok: true; reason: 'ok' }
  | { ok: false; reason: 'needs-dates' }
  | { ok: false; reason: 'checking' }
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'insufficient'; remaining: number };

export interface AddToCartGateInput {
  startDate: string | null;
  endDate: string | null;
  /** Units free for the range; null/undefined while availability is loading. */
  availableUnits: number | null | undefined;
  quantity: number;
  /** Units of this item already in the cart. */
  inCart?: number;
  now?: Date;
}

export function addToCartGate({
  startDate,
  endDate,
  availableUnits,
  quantity,
  inCart = 0,
  now,
}: AddToCartGateInput): AddToCartGate {
  if (!isValidRange(startDate, endDate, now)) return { ok: false, reason: 'needs-dates' };
  if (availableUnits == null) return { ok: false, reason: 'checking' };
  if (availableUnits <= 0) return { ok: false, reason: 'unavailable' };
  const remaining = Math.max(0, availableUnits - inCart);
  if (remaining <= 0) return { ok: false, reason: 'unavailable' };
  if (quantity > remaining) return { ok: false, reason: 'insufficient', remaining };
  return { ok: true, reason: 'ok' };
}

/** Availability for one item: the RPC omits rows it has no stock data for, which means none free. */
export function unitsFor(
  availabilityMap: Record<string, number> | undefined,
  equipmentId: string,
): number | null {
  if (!availabilityMap) return null;
  return availabilityMap[equipmentId] ?? 0;
}

export function gateMessage(gate: AddToCartGate, name: string): string | null {
  switch (gate.reason) {
    case 'ok':
      return null;
    case 'needs-dates':
      return 'Pick your rental dates first so we can check availability.';
    case 'checking':
      return 'Checking availability for your dates, try again in a moment.';
    case 'unavailable':
      return `${name} is not available for your dates.`;
    case 'insufficient':
      return `Only ${gate.remaining} more ${name} available for your dates.`;
  }
}
