import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Truck, Store } from 'lucide-react';
import { itemTotal, type BookingTotals } from '@/lib/pricing/bookingTotals';
import type { WizardCartLine, WizardFulfillment, WizardInitialStatus } from './types';

interface StepReviewProps {
  cart: WizardCartLine[];
  totals: BookingTotals;
  billableDays: number;
  fulfillment: WizardFulfillment;
  customerName: string;
  canDiscount: boolean;
  discount: number;
  onDiscountChange: (v: number) => void;
  initialStatus: WizardInitialStatus;
  onInitialStatusChange: (v: WizardInitialStatus) => void;
}

export function StepReview({
  cart,
  totals,
  billableDays,
  fulfillment,
  customerName,
  canDiscount,
  discount,
  onDiscountChange,
  initialStatus,
  onInitialStatusChange,
}: StepReviewProps) {
  const grandTotal = Math.max(0, totals.total - (canDiscount ? discount : 0));

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Review &amp; confirm</h3>
        <p className="text-sm text-muted-foreground">
          {customerName ? `Order for ${customerName}. ` : ''}
          {fulfillment === 'pickup' ? 'Store pickup.' : 'Delivery.'}
        </p>
      </div>

      {/* Line items */}
      <div className="space-y-2 rounded-lg border border-border/60 p-3">
        {cart.map((line) => {
          const lineTotal = itemTotal(
            {
              price_per_day: line.item.price_per_day,
              price_per_week: line.item.price_per_week,
              quantity: line.quantity,
            },
            billableDays,
          );
          return (
            <div key={line.item.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{line.item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {line.quantity} × ${line.item.price_per_day.toFixed(2)}/day · {billableDays}{' '}
                  {billableDays === 1 ? 'day' : 'days'}
                </p>
              </div>
              <span className="shrink-0 tabular-nums">${lineTotal.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Equipment</span>
          <span className="tabular-nums">${totals.equipmentTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {fulfillment === 'pickup' ? <Store className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
            {fulfillment === 'pickup' ? 'Pickup' : 'Delivery fee'}
          </span>
          <span className="tabular-nums">
            {totals.deliveryFee > 0 ? `$${totals.deliveryFee.toFixed(2)}` : 'Free'}
          </span>
        </div>
        {canDiscount && discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount</span>
            <span className="tabular-nums">-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border/60 pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Discount — Admin / SuperUser / Booker only */}
      {canDiscount && (
        <div className="space-y-1.5">
          <Label htmlFor="wizard-discount">Discount ($)</Label>
          <Input
            id="wizard-discount"
            type="number"
            min={0}
            max={totals.total}
            value={discount || ''}
            onChange={(e) =>
              onDiscountChange(Math.max(0, Math.min(totals.total, Number(e.target.value) || 0)))
            }
            placeholder="0.00"
          />
        </div>
      )}

      {/* Initial status */}
      <div className="space-y-2">
        <Label>Order status</Label>
        <RadioGroup
          value={initialStatus}
          onValueChange={(v) => onInitialStatusChange(v as WizardInitialStatus)}
          className="gap-2"
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <RadioGroupItem value="confirmed" id="status-confirmed" className="mt-0.5" />
            <div>
              <p className="text-sm font-medium">Confirmed</p>
              <p className="text-xs text-muted-foreground">Order is placed and holds equipment immediately.</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <RadioGroupItem value="pending" id="status-pending" className="mt-0.5" />
            <div>
              <p className="text-sm font-medium">Awaiting payment</p>
              <p className="text-xs text-muted-foreground">Holds equipment; mark paid later once settled.</p>
            </div>
          </label>
        </RadioGroup>
      </div>
    </div>
  );
}
