import { StepDates } from '@/components/staff/order-wizard/StepDates';
import { StepCatalog } from '@/components/staff/order-wizard/StepCatalog';
import type { CatalogItem, WizardCartLine } from '@/components/staff/order-wizard/types';
import type { AvailabilityMap } from '@/lib/queries/availability';
import type { BookingTotals } from '@/lib/pricing/bookingTotals';
import { PosTotalsPreview } from './PosTotalsPreview';

interface PosStepRentalProps {
  startDate: string;
  endDate: string;
  onDatesChange: (start: string, end: string) => void;
  cart: WizardCartLine[];
  availability: AvailabilityMap | undefined;
  availabilityLoading: boolean;
  onSetQuantity: (item: CatalogItem, quantity: number) => void;
  totals: BookingTotals;
}

/** Screen 1: dates (default today -> tomorrow, set by the wizard) + live
 * catalog with search/qty. Reuses the staff Order Wizard's StepDates/
 * StepCatalog so counter sales and staff orders share one set of pickers. */
export function PosStepRental({
  startDate,
  endDate,
  onDatesChange,
  cart,
  availability,
  availabilityLoading,
  onSetQuantity,
  totals,
}: PosStepRentalProps) {
  return (
    <div className="space-y-6">
      <StepDates startDate={startDate} endDate={endDate} onChange={onDatesChange} />
      <StepCatalog
        cart={cart}
        availability={availability}
        availabilityLoading={availabilityLoading}
        onSetQuantity={onSetQuantity}
      />
      <PosTotalsPreview totals={totals} itemCount={cart.length} />
    </div>
  );
}
