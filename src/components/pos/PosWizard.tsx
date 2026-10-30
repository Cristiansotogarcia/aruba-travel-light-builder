import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getEquipmentAvailability } from '@/lib/queries/availability';
import { computeBookingTotals } from '@/lib/pricing/bookingTotals';
import { parseAvailabilityConflict } from '@/lib/queries/booking-create';
import { createPosSale, type PosSaleResult } from '@/lib/queries/pos';
import { fetchOpenDrawerSession } from '@/lib/queries/posCloseOut';
import type { PosPaymentLine } from '@/lib/pos/posPayments';
import type { CatalogItem, WizardCartLine } from '@/components/staff/order-wizard/types';
import { todayDateOnly } from '@/lib/dateOnly';

import { PosStepRental } from './PosStepRental';
import { PosStepCustomer } from './PosStepCustomer';
import { PosStepPay } from './PosStepPay';
import { PosDone } from './PosDone';
import {
  EMPTY_POS_CUSTOMER,
  POS_STEPS,
  type PosCustomerFields,
  type PosLeg,
  type PosReturnLeg,
  type PosStepId,
} from './types';

const STEP_LABELS: Record<PosStepId, string> = {
  rental: 'Rental',
  customer: 'Customer',
  pay: 'Pay',
  done: 'Done',
};

const defaultStartDate = () => todayDateOnly();
const defaultEndDate = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');

// Error prefixes raised by pos_create_sale (see the migration) that we strip
// before showing the message to staff — the AVAILABILITY_CONFLICT one is
// parsed into a friendlier sentence instead via parseAvailabilityConflict.
const KNOWN_ERROR_PREFIXES = [
  /^NOT_AUTHENTICATED:?\s*/,
  /^NOT_AUTHORIZED:?\s*/,
  /^PRICING_IS_SERVER_DERIVED:?\s*/,
  /^PRICING_UNAVAILABLE:?\s*/,
  /^CARD_REFERENCE_REQUIRED:?\s*/,
  /^TENDERED_CASH_ONLY:?\s*/,
  /^TENDERED_BELOW_AMOUNT:?\s*/,
  /^OVERPAY:?\s*/,
];

/**
 * POS phase 1 (counter rental) wizard: Rental -> Customer -> Pay -> Done.
 *
 * The Pay screen can only show an ESTIMATED total (computeBookingTotals),
 * never the RPC's authoritative figure — pos_create_sale prices and charges
 * in the SAME atomic call (contract: "In ONE transaction"), so there is no
 * separate "quote" step to call first. The RPC's returned total/paid/
 * change_due becomes authoritative the moment the sale succeeds and is what
 * the Done screen and receipt display; the estimate is only ever used to
 * pre-fill and validate payment lines before that call.
 */
export function PosWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [cart, setCart] = useState<WizardCartLine[]>([]);
  const [customer, setCustomer] = useState<PosCustomerFields>(EMPTY_POS_CUSTOMER);
  const [leg, setLeg] = useState<PosLeg>('pickup_now');
  const [returnLeg, setReturnLeg] = useState<PosReturnLeg>('store_return');
  const [lines, setLines] = useState<PosPaymentLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PosSaleResult | null>(null);

  const step = POS_STEPS[stepIndex];
  const datesValid = !!startDate && !!endDate && new Date(endDate) > new Date(startDate);

  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ['pos-equipment-availability', startDate, endDate],
    queryFn: () => getEquipmentAvailability(startDate, endDate),
    enabled: datesValid,
    staleTime: 60_000,
  });

  // Phase 3 (contract: PLANS/TLB_POS_PHASE3_CONTRACT.md): the Pay step shows
  // a non-blocking "Drawer is not open" warning on a Cash line when no drawer
  // is open. Only fetched while on the Pay step — the wizard never needs it
  // earlier, and it's cheap enough to not bother gating on step === 'pay'.
  const { data: drawerSession } = useQuery({
    queryKey: ['pos-drawer-session'],
    queryFn: fetchOpenDrawerSession,
    staleTime: 15_000,
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
        fulfillmentMethod: leg === 'delivery' ? 'delivery' : 'pickup',
      }),
    [cart, startDate, endDate, leg],
  );

  const setQuantity = (item: CatalogItem, quantity: number) => {
    setCart((prev) => {
      const rest = prev.filter((l) => l.item.id !== item.id);
      if (quantity <= 0) return rest;
      return [...rest, { item, quantity }];
    });
  };

  const stepValid = useMemo(() => {
    switch (step) {
      case 'rental':
        return datesValid && cart.length > 0;
      case 'customer':
        return (
          customer.name.trim().length > 0 &&
          customer.phone.trim().length > 0 &&
          (leg !== 'delivery' || customer.address.trim().length > 0)
        );
      default:
        return true;
    }
  }, [step, datesValid, cart, customer, leg]);

  const resetForNewSale = () => {
    setStepIndex(0);
    setStartDate(defaultStartDate());
    setEndDate(defaultEndDate());
    setCart([]);
    setCustomer(EMPTY_POS_CUSTOMER);
    setLeg('pickup_now');
    setReturnLeg('store_return');
    setLines([]);
    setErrorMessage(null);
    setResult(null);
  };

  const submitSale = async (payments: PosPaymentLine[]) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const sale = await createPosSale({
        startDate,
        endDate,
        leg,
        returnLeg,
        customer,
        items: cart.map((l) => ({ equipmentId: l.item.id, equipmentName: l.item.name, quantity: l.quantity })),
        payments,
      });
      setResult(sale);
      setStepIndex(POS_STEPS.indexOf('done'));
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Failed to ring up the sale.';
      const conflicts = parseAvailabilityConflict(raw);
      if (conflicts) {
        setErrorMessage(
          `Some items are no longer available: ${conflicts
            .map((c) => `${c.requested} requested, ${c.available} left`)
            .join('; ')}`,
        );
      } else {
        let message = raw;
        for (const prefix of KNOWN_ERROR_PREFIXES) {
          message = message.replace(prefix, '');
        }
        setErrorMessage(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isPayStep = step === 'pay';

  return (
    <div className="space-y-6">
      {step !== 'done' && (
        <div className="flex flex-wrap gap-1.5">
          {POS_STEPS.filter((s) => s !== 'done').map((s, i) => (
            <Badge
              key={s}
              variant="outline"
              className={cn(
                'h-6 gap-1 px-2 text-[11px]',
                s === step
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

      {step === 'rental' && (
        <PosStepRental
          startDate={startDate}
          endDate={endDate}
          onDatesChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
          cart={cart}
          availability={availability}
          availabilityLoading={availabilityLoading}
          onSetQuantity={setQuantity}
          totals={totals}
        />
      )}

      {step === 'customer' && (
        <PosStepCustomer
          customer={customer}
          onCustomerChange={setCustomer}
          leg={leg}
          onLegChange={setLeg}
          returnLeg={returnLeg}
          onReturnLegChange={setReturnLeg}
        />
      )}

      {step === 'pay' && (
        <PosStepPay
          estimatedTotal={totals.total}
          lines={lines}
          onLinesChange={setLines}
          onCharge={() => void submitSale(lines)}
          onPayLater={() => void submitSale([])}
          submitting={submitting}
          errorMessage={errorMessage}
          drawerOpen={!!drawerSession}
        />
      )}

      {step === 'done' && result && (
        <PosDone
          result={result}
          customerName={customer.name}
          customerEmail={customer.email}
          cart={cart}
          startDate={startDate}
          endDate={endDate}
          onNewSale={resetForNewSale}
        />
      )}

      {step !== 'done' && (
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0 || submitting}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {!isPayStep && (
            <Button type="button" onClick={() => setStepIndex((i) => i + 1)} disabled={!stepValid}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
