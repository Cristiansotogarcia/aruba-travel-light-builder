import { Card, CardContent } from '@/components/ui/card';
import type { BookingTotals } from '@/lib/pricing/bookingTotals';

interface PosTotalsPreviewProps {
  totals: BookingTotals;
  itemCount: number;
}

/**
 * Rental-screen running total. PREVIEW ONLY — this renders exactly what
 * computeBookingTotals returns for the current cart/dates, the same function
 * the public site and the staff Order Wizard use, so the number on screen can
 * never drift from the shared pricing rules. pos_create_sale ignores this
 * value entirely and re-prices server-side (price_booking); the authoritative
 * total only exists in the RPC response, shown on the Pay screen and receipt.
 */
export function PosTotalsPreview({ totals, itemCount }: PosTotalsPreviewProps) {
  return (
    <Card className="border-dashed border-primary/40 bg-primary/5">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="text-sm text-muted-foreground">
          <p>
            {itemCount} item{itemCount === 1 ? '' : 's'} · {totals.days} night{totals.days === 1 ? '' : 's'}
          </p>
          <p className="text-xs">Estimated — the server confirms the final total at checkout.</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums" data-testid="pos-preview-total">
          ${totals.total.toFixed(2)}
        </p>
      </CardContent>
    </Card>
  );
}
