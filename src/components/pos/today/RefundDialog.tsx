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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { issueCounterRefund } from '@/lib/queries/posToday';
import { validateRefundAmount } from '@/lib/pos/refund';
import type { TodayBoardBooking } from '@/lib/pos/todayBoard';

interface RefundDialogProps {
  booking: TodayBoardBooking;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

// Strip the RPC's own error text where it already reads as a sentence
// (create_credit_note raises plain messages, no ERRCODE prefix convention),
// but still guard against an unexpected network/auth error shape.
const FALLBACK_MESSAGE = 'The refund could not be issued.';

/** "Refund via credit note" (plan: PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md
 * line 58). Reuses the existing create_credit_note RPC — role gate widened
 * to Booker/StoreStaff by the phase 2 migration — rather than a new one.
 * The server is authoritative on the remaining-creditable limit; this dialog
 * only has the booking's total_amount to work with (no "already credited"
 * figure is fetched here), so validateRefundAmount is called with
 * alreadyCredited = 0 purely as a client-side sanity check against the
 * total — the RPC still enforces the real multi-note limit. */
export const RefundDialog = ({ booking, open, onClose, onCompleted }: RefundDialogProps) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setAmount('');
      setReason('');
      setError(null);
    }
  }, [open, booking.booking_id]);

  const numericAmount = typeof amount === 'number' ? amount : Number.NaN;
  const validation = validateRefundAmount(numericAmount, booking.total_amount, 0, reason);

  const handleSubmit = async () => {
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await issueCounterRefund(booking.booking_id, numericAmount, reason.trim());
      toast({
        title: 'Credit note issued',
        description: `${result.creditNumber} for $${result.amount.toFixed(2)}.`,
      });
      onCompleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : FALLBACK_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refund via Credit Note</DialogTitle>
          <DialogDescription>
            Booking <span className="font-mono font-semibold">{booking.pickup_code ?? booking.booking_id}</span> —
            total ${booking.total_amount.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Amount</Label>
            <Input
              id="refund-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.valueAsNumber)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Up to ${validation.remaining.toFixed(2)} remaining.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason (required)</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this booking is being credited…"
              rows={3}
            />
          </div>

          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !validation.valid}>
            {submitting ? 'Issuing…' : 'Issue Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
