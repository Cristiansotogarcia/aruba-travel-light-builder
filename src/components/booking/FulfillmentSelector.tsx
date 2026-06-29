import { Button } from '@/components/ui/button';
import { Truck, Store } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

type FulfillmentMethod = 'delivery' | 'pickup';

interface FulfillmentSelectorProps {
  value: FulfillmentMethod;
  onChange: (method: FulfillmentMethod) => void;
}

export const FulfillmentSelector = ({ value, onChange }: FulfillmentSelectorProps) => {
  const { getSetting } = useSystemSettings();
  const pickupEnabled = getSetting('pickup_enabled') === 'true';

  // If pickup is not enabled, render nothing (delivery is default and the only option)
  if (!pickupEnabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-base font-semibold">Delivery or Pickup?</p>
      <div className="flex gap-3">
        <Button
          type="button"
          variant={value === 'delivery' ? 'default' : 'outline'}
          className="flex-1 flex items-center justify-center gap-2"
          onClick={() => onChange('delivery')}
          aria-pressed={value === 'delivery'}
        >
          <Truck className="h-4 w-4" />
          Delivery
        </Button>
        <Button
          type="button"
          variant={value === 'pickup' ? 'default' : 'outline'}
          className="flex-1 flex items-center justify-center gap-2"
          onClick={() => onChange('pickup')}
          aria-pressed={value === 'pickup'}
        >
          <Store className="h-4 w-4" />
          Store Pickup
        </Button>
      </div>
      {value === 'delivery' && (
        <p className="text-sm text-muted-foreground">
          We deliver and collect at your accommodation. A delivery fee may apply for short rentals.
        </p>
      )}
      {value === 'pickup' && (
        <p className="text-sm text-muted-foreground">
          Collect and return at our store — no delivery fee.
        </p>
      )}
    </div>
  );
};
