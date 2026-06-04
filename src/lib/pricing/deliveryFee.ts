// src/lib/pricing/deliveryFee.ts
export type FulfillmentMethod = 'delivery' | 'pickup';

function isSunday(isoDate: string): boolean {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

// Pickup never has a delivery fee. Delivery: $20 Sunday start, else $10 if < 5 days, else free.
export function computeDeliveryFee(method: FulfillmentMethod, startDate: string, days: number): number {
  if (method === 'pickup') return 0;
  if (isSunday(startDate)) return 20;
  if (days < 5) return 10;
  return 0;
}
