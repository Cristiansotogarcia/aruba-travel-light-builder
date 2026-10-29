import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { extendBookingRental } from '@/lib/queries/posToday';
import { validateExtensionDate, extensionNightsAdded } from '@/lib/pos/extendRental';
import { formatDateOnly } from '@/lib/dateOnly';
import type { TodayBoardBooking } from '@/lib/pos/todayBoard';

interface ExtendRentalDialogProps {
  booking: TodayBoardBooking;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

// Strip the RPC's error-code prefixes (see the migration) before showing the
// message to staff, same pattern as PosWizard's KNOWN_ERROR_PREFIXES.
const KNOWN_ERROR_PREFIXES = [
  /^NOT_AUTHENTICATED:?\s*/,
  /^NOT_AUTHORIZED:?\s*/,
  /^BOOKING_NOT_EXTENDABLE:?\s*/,
  /^INVALID_EXTENSION:?\s*/,
  /^PRICING_UNAVAILABLE:?\s*/,
  /^REPRICE_BELOW_CURRENT_TOTAL:?\s*/,
];

const stripKnownPrefixes = (message: string): string => {
  let out = message;
  for (const prefix of KNOWN_ERROR_PREFIXES) {
    out = out.replace(prefix, '');
  }
  return out;
};

/** "Extend a rental" (plan: PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md line 57).
 * No client price is ever sent — extend_booking_rental re-checks stock and
 * reprices server-side. */
export const ExtendRentalDialog = ({ booking, open, onClose, onCompleted }: ExtendRentalDialogProps) => {
  const [newEndDate, setNewEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setNewEndDate('');
      setError(null);
    }
  }, [open, booking.booking_id]);

  const validation = validateExtensionDate(booking.end_date, newEndDate);
  const nightsAdded = validation.valid ? extensionNightsAdded(booking.end_date, newEndDate) : 0;

  const handleSubmit = async () => {
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await extendBookingRental(booking.booking_id, newEndDate);
      toast({
        title: 'Rental extended',
        description: `New end date ${formatDateOnly(result.newEndDate)} — additional $${result.additionalAmount.toFixed(2)} due.`,
      });
      onCompleted();
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'The rental could not be extended.';
      setError(stripKnownPrefixes(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Extend Rental</DialogTitle>
          <DialogDescription>
            Booking <span className="font-mono font-semibold">{booking.pickup_code ?? booking.booking_id}</span>{' '}
            currently ends {formatDateOnly(booking.end_date)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="extend-new-end-date">New end date</Label>
            <Input
              id="extend-new-end-date"
              type="date"
              min={booking.end_date}
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              autoFocus
            />
            {newEndDate && validation.valid && (
              <p className="text-sm text-muted-foreground">
                +{nightsAdded} night{nightsAdded === 1 ? '' : 's'}. The server will re-check stock and reprice
                before confirming.
              </p>
            )}
          </div>

          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !newEndDate || !validation.valid}
          >
            {submitting ? 'Extending…' : 'Extend'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
