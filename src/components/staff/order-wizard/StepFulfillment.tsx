import { Truck, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { StoreLocationCard } from '@/components/booking/StoreLocationCard';
import { computeDeliveryFee } from '@/lib/pricing/deliveryFee';
import { billableDays } from '@/lib/pricing/bookingTotals';
import type { WizardFulfillment } from './types';

type Slot = 'morning' | 'afternoon';

interface StepFulfillmentProps {
  fulfillment: WizardFulfillment;
  lockFulfillment: boolean;
  onFulfillmentChange: (method: WizardFulfillment) => void;
  address: string;
  onAddressChange: (v: string) => void;
  roomNumber: string;
  onRoomNumberChange: (v: string) => void;
  deliverySlot?: Slot;
  pickupSlot?: Slot;
  onDeliverySlotChange: (s: Slot) => void;
  onPickupSlotChange: (s: Slot) => void;
  startDate: string;
  endDate: string;
}

const SlotToggle = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Slot;
  onChange: (s: Slot) => void;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    <div className="grid grid-cols-2 gap-2">
      {(['morning', 'afternoon'] as Slot[]).map((slot) => (
        <Button
          key={slot}
          type="button"
          variant={value === slot ? 'default' : 'outline'}
          className="capitalize"
          onClick={() => onChange(slot)}
          aria-pressed={value === slot}
        >
          {slot}
        </Button>
      ))}
    </div>
  </div>
);

export function StepFulfillment({
  fulfillment,
  lockFulfillment,
  onFulfillmentChange,
  address,
  onAddressChange,
  roomNumber,
  onRoomNumberChange,
  deliverySlot,
  pickupSlot,
  onDeliverySlotChange,
  onPickupSlotChange,
  startDate,
  endDate,
}: StepFulfillmentProps) {
  // Match the authoritative total: bill on days INCLUDING the morning-delivery +
  // afternoon-pickup +1 rule, so the preview never disagrees with the Review total.
  const days = billableDays(startDate, endDate, deliverySlot, pickupSlot);
  const fee = computeDeliveryFee('delivery', startDate || '2000-01-01', days);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Fulfillment</h3>
        <p className="text-sm text-muted-foreground">How does the customer receive the equipment?</p>
      </div>

      {!lockFulfillment && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={fulfillment === 'delivery' ? 'default' : 'outline'}
            className="h-auto flex-col gap-1 py-3"
            onClick={() => onFulfillmentChange('delivery')}
            aria-pressed={fulfillment === 'delivery'}
          >
            <Truck className="h-5 w-5" />
            <span>Delivery</span>
          </Button>
          <Button
            type="button"
            variant={fulfillment === 'pickup' ? 'default' : 'outline'}
            className="h-auto flex-col gap-1 py-3"
            onClick={() => onFulfillmentChange('pickup')}
            aria-pressed={fulfillment === 'pickup'}
          >
            <Store className="h-5 w-5" />
            <span>Store pickup</span>
          </Button>
        </div>
      )}

      {fulfillment === 'delivery' ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wizard-address">Delivery address</Label>
            <Input
              id="wizard-address"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Accommodation / street address"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wizard-room">Room / unit number (optional)</Label>
            <Input
              id="wizard-room"
              value={roomNumber}
              onChange={(e) => onRoomNumberChange(e.target.value)}
              placeholder="e.g. 214"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SlotToggle label="Delivery time" value={deliverySlot} onChange={onDeliverySlotChange} />
            <SlotToggle label="Pickup time" value={pickupSlot} onChange={onPickupSlotChange} />
          </div>
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              fee > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800',
            )}
          >
            {fee > 0 ? `Delivery fee: $${fee.toFixed(2)}` : 'No delivery fee for these dates.'}
          </div>
        </div>
      ) : (
        <StoreLocationCard />
      )}
    </div>
  );
}
