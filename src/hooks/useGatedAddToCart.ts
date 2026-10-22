// src/hooks/useGatedAddToCart.ts
// One add-to-cart path for every storefront button: dates first, then availability.
import { useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useAvailability } from '@/hooks/useAvailability';
import { useCart } from '@/hooks/useCart';
import { useRentalDates } from '@/hooks/useRentalDates';
import { addToCartGate, gateMessage, unitsFor } from '@/lib/addToCartGate';
import { isValidRange } from '@/lib/rentalDates';
import type { Product } from '@/types/types';

export function useGatedAddToCart() {
  const { startDate, endDate, requestPicker } = useRentalDates();
  const { data: availabilityMap } = useAvailability(startDate, endDate);
  const { items, addItem } = useCart();
  const hasDates = isValidRange(startDate, endDate);

  const check = useCallback(
    (equipmentId: string, quantity: number) =>
      addToCartGate({
        startDate,
        endDate,
        availableUnits: unitsFor(availabilityMap, equipmentId),
        quantity,
        inCart: items.find((i) => i.equipment_id === equipmentId)?.quantity ?? 0,
      }),
    [startDate, endDate, availabilityMap, items],
  );

  const tryAdd = useCallback(
    (product: Product, quantity: number): boolean => {
      const gate = check(product.id, quantity);
      const message = gateMessage(gate, product.name);
      if (gate.reason !== 'ok') {
        if (gate.reason === 'needs-dates') {
          toast({ title: 'Choose your dates', description: message ?? undefined });
          requestPicker();
        } else {
          toast({ title: 'Not available', description: message ?? undefined, variant: 'destructive' });
        }
        return false;
      }
      addItem(product, quantity);
      toast({ title: 'Added to cart', description: `${quantity} × ${product.name}` });
      return true;
    },
    [check, addItem, requestPicker],
  );

  /** Units free for the chosen dates, or null when no dates are set / still loading. */
  const unitsForDates = useCallback(
    (equipmentId: string) => (hasDates ? unitsFor(availabilityMap, equipmentId) : null),
    [hasDates, availabilityMap],
  );

  return { hasDates, check, tryAdd, unitsForDates };
}
