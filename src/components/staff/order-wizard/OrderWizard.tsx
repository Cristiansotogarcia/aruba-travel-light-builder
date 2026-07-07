import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getEquipmentAvailability } from '@/lib/queries/availability';
import { computeBookingTotals } from '@/lib/pricing/bookingTotals';
import { createBookingAsStaff } from '@/lib/queries/booking-create-staff';
import { parseAvailabilityConflict } from '@/lib/queries/booking-create';
import { isValidRange } from '@/lib/rentalDates';

import { StepDates } from './StepDates';
import { StepCatalog } from './StepCatalog';
import { StepFulfillment } from './StepFulfillment';
import { StepCustomer, type CustomerFields } from './StepCustomer';
import { StepReview } from './StepReview';
import {
  CAN_DISCOUNT_ROLES,
  WIZARD_STEPS,
  type CatalogItem,
  type OrderWizardProps,
  type WizardCartLine,
  type WizardFulfillment,
  type WizardInitialStatus,
} from './types';

const STEP_LABELS: Record<(typeof WIZARD_STEPS)[number], string> = {
  dates: 'Dates',
  catalog: 'Equipment',
  fulfillment: 'Fulfillment',
  customer: 'Customer',
  review: 'Review',
};

const emailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function OrderWizard({
  open,
  onOpenChange,
  onCreated,
  defaultFulfillment = 'delivery',
  lockFulfillment = false,
  defaultStartDate = '',
  defaultEndDate = '',
  role,
}: OrderWizardProps) {
  const { toast } = useToast();
  const canDiscount = !!role && CAN_DISCOUNT_ROLES.includes(role);

  const [stepIndex, setStepIndex] = useState(0);
  const [fulfillment, setFulfillment] = useState<WizardFulfillment>(defaultFulfillment);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [cart, setCart] = useState<WizardCartLine[]>([]);
  const [address, setAddress] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [deliverySlot, setDeliverySlot] = useState<'morning' | 'afternoon' | undefined>();
  const [pickupSlot, setPickupSlot] = useState<'morning' | 'afternoon' | undefined>();
  const [customer, setCustomer] = useState<CustomerFields>({ name: '', email: '', phone: '', comment: '' });
  const [discount, setDiscount] = useState(0);
  const [initialStatus, setInitialStatus] = useState<WizardInitialStatus>('confirmed');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ bookingId: string; pickupCode: string | null } | null>(null);

  // Reset to a clean slate every time the wizard opens.
  useEffect(() => {
    if (open) {
      setStepIndex(0);
      setFulfillment(defaultFulfillment);
      setStartDate(defaultStartDate);
      setEndDate(defaultEndDate);
      setCart([]);
      setAddress('');
      setRoomNumber('');
      setDeliverySlot(undefined);
      setPickupSlot(undefined);
      setCustomer({ name: '', email: '', phone: '', comment: '' });
      setDiscount(0);
      setInitialStatus('confirmed');
      setSubmitting(false);
      setSuccess(null);
    }
  }, [open, defaultFulfillment, defaultStartDate, defaultEndDate]);

  const datesValid = !!startDate && !!endDate && new Date(endDate) > new Date(startDate);

  // Availability for the chosen dates, mirrored from useAvailability but keyed on
  // the wizard-local range. Only fires once a valid range is set.
  const availabilityEnabled = isValidRange(startDate || null, endDate || null) || datesValid;
  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ['equipment-availability', startDate, endDate],
    queryFn: () => getEquipmentAvailability(startDate, endDate),
    enabled: open && availabilityEnabled,
    staleTime: 60_000,
  });

  const totals = useMemo(
    () =>
      computeBookingTotals({
        items: cart.map((l) => ({
          price_per_day: l.item.price_per_day,
          price_per_week: l.item.price_per_week,
          quantity: l.quantity,
        })),
        startDate,
        endDate,
        deliverySlot,
        pickupSlot,
        fulfillmentMethod: fulfillment,
      }),
    [cart, startDate, endDate, deliverySlot, pickupSlot, fulfillment],
  );

  const setQuantity = (item: CatalogItem, quantity: number) => {
    setCart((prev) => {
      const rest = prev.filter((l) => l.item.id !== item.id);
      if (quantity <= 0) return rest;
      return [...rest, { item, quantity }];
    });
  };

  const updateCustomer = (field: keyof CustomerFields, value: string) =>
    setCustomer((prev) => ({ ...prev, [field]: value }));

  // Per-step gate for the Next / Submit button.
  const stepValid = useMemo(() => {
    switch (WIZARD_STEPS[stepIndex]) {
      case 'dates':
        return datesValid;
      case 'catalog':
        return cart.length > 0;
      case 'fulfillment':
        if (fulfillment === 'pickup') return true;
        return address.trim().length > 0 && !!deliverySlot && !!pickupSlot;
      case 'customer':
        return customer.name.trim().length > 0 && emailValid(customer.email) && customer.phone.trim().length > 0;
      case 'review':
        return cart.length > 0;
      default:
        return false;
    }
  }, [stepIndex, datesValid, cart, fulfillment, address, deliverySlot, pickupSlot, customer]);

  const isLast = stepIndex === WIZARD_STEPS.length - 1;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const grandTotal = Math.max(0, totals.total - (canDiscount ? discount : 0));
      const result = await createBookingAsStaff({
        startDate,
        endDate,
        totalAmount: grandTotal,
        customerInfo: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: fulfillment === 'delivery' ? address : '',
          room_number: fulfillment === 'delivery' ? roomNumber : '',
          comment: customer.comment,
        },
        deliverySlot: fulfillment === 'delivery' ? deliverySlot : undefined,
        pickupSlot: fulfillment === 'delivery' ? pickupSlot : undefined,
        items: cart.map((l) => ({
          equipment_id: l.item.id,
          equipment_name: l.item.name,
          equipment_price: l.item.price_per_day,
          quantity: l.quantity,
          subtotal: computeBookingTotals({
            items: [
              { price_per_day: l.item.price_per_day, price_per_week: l.item.price_per_week, quantity: l.quantity },
            ],
            startDate,
            endDate,
            deliverySlot,
            pickupSlot,
            fulfillmentMethod: 'pickup', // exclude delivery fee from a line subtotal
          }).equipmentTotal,
        })),
        fulfillmentMethod: fulfillment,
        initialStatus,
      });
      setSuccess({ bookingId: result.bookingId, pickupCode: result.pickupCode });
      onCreated?.({ bookingId: result.bookingId, pickupCode: result.pickupCode });
      toast({ title: 'Order created', description: `Booking #${result.bookingId.slice(0, 8)} created.` });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Failed to create the order.';
      const conflicts = parseAvailabilityConflict(raw);
      const message = conflicts
        ? `Some items are no longer available: ${conflicts.map((c) => `${c.requested} requested, ${c.available} left`).join('; ')}`
        : raw.replace(/^NOT_AUTHORIZED:\s*/, '').replace(/^AVAILABILITY_CONFLICT:\s*/, '');
      toast({ title: 'Could not create order', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="border-b border-border/60 px-4 py-3 sm:px-6">
          <DialogTitle className="text-base sm:text-lg">
            {success ? 'Order created' : 'New order'}
          </DialogTitle>
          {!success && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WIZARD_STEPS.map((s, i) => (
                <Badge
                  key={s}
                  variant="outline"
                  className={cn(
                    'h-6 gap-1 px-2 text-[11px]',
                    i === stepIndex
                      ? 'border-primary bg-primary/10 text-primary'
                      : i < stepIndex
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'text-muted-foreground',
                  )}
                >
                  {i < stepIndex && <Check className="h-3 w-3" />}
                  {STEP_LABELS[s]}
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {success ? (
            <SuccessPanel success={success} onClose={() => onOpenChange(false)} toastCopy={toast} />
          ) : (
            <>
              {WIZARD_STEPS[stepIndex] === 'dates' && (
                <StepDates
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(s, e) => {
                    setStartDate(s);
                    setEndDate(e);
                  }}
                />
              )}
              {WIZARD_STEPS[stepIndex] === 'catalog' && (
                <StepCatalog
                  cart={cart}
                  availability={availability}
                  availabilityLoading={availabilityLoading}
                  onSetQuantity={setQuantity}
                />
              )}
              {WIZARD_STEPS[stepIndex] === 'fulfillment' && (
                <StepFulfillment
                  fulfillment={fulfillment}
                  lockFulfillment={lockFulfillment}
                  onFulfillmentChange={setFulfillment}
                  address={address}
                  onAddressChange={setAddress}
                  roomNumber={roomNumber}
                  onRoomNumberChange={setRoomNumber}
                  deliverySlot={deliverySlot}
                  pickupSlot={pickupSlot}
                  onDeliverySlotChange={setDeliverySlot}
                  onPickupSlotChange={setPickupSlot}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
              {WIZARD_STEPS[stepIndex] === 'customer' && (
                <StepCustomer customer={customer} onChange={updateCustomer} />
              )}
              {WIZARD_STEPS[stepIndex] === 'review' && (
                <StepReview
                  cart={cart}
                  totals={totals}
                  billableDays={totals.days}
                  fulfillment={fulfillment}
                  customerName={customer.name}
                  canDiscount={canDiscount}
                  discount={discount}
                  onDiscountChange={setDiscount}
                  initialStatus={initialStatus}
                  onInitialStatusChange={setInitialStatus}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (stepIndex === 0 ? onOpenChange(false) : setStepIndex((i) => i - 1))}
              disabled={submitting}
            >
              {stepIndex === 0 ? (
                'Cancel'
              ) : (
                <>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </>
              )}
            </Button>

            {isLast ? (
              <Button type="button" onClick={handleSubmit} disabled={!stepValid || submitting}>
                {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                Create order
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setStepIndex((i) => i + 1)}
                disabled={!stepValid}
              >
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuccessPanel({
  success,
  onClose,
  toastCopy,
}: {
  success: { bookingId: string; pickupCode: string | null };
  onClose: () => void;
  toastCopy: ReturnType<typeof useToast>['toast'];
}) {
  return (
    <div className="space-y-5 py-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <PartyPopper className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Order created</p>
        <p className="text-sm text-muted-foreground">Booking #{success.bookingId.slice(0, 8)}</p>
      </div>

      {success.pickupCode && (
        <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pickup code</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-primary">{success.pickupCode}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              void navigator.clipboard?.writeText(success.pickupCode as string);
              toastCopy({ title: 'Pickup code copied' });
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy code
          </Button>
          <p className="text-xs text-muted-foreground">Give this code to the customer for collection.</p>
        </div>
      )}

      <Button type="button" onClick={onClose} className="w-full sm:w-auto">
        Done
      </Button>
    </div>
  );
}

export default OrderWizard;
