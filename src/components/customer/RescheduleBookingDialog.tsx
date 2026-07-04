import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { MIN_NIGHTS } from '@/lib/rentalDates';
import { describeSelfServiceError } from '@/lib/customer/selfService';

interface RescheduleItem {
  equipment_id: string;
  equipment_name: string;
  quantity: number;
}

interface RescheduleBookingDialogProps {
  bookingId: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  items: RescheduleItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AvailabilityConflict {
  equipment_id: string;
  requested: number;
  available: number;
}

const toIso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Date-range picker dialog for moving a booking to new dates.
 * The RPC re-checks availability for every item on the new range (excluding
 * this booking's own footprint) and returns conflicts instead of updating
 * when equipment is unavailable. A successful change goes back to
 * pending_admin_review with a fresh 48h hold.
 */
export function RescheduleBookingDialog({
  bookingId,
  startDate,
  endDate,
  items,
  open,
  onOpenChange,
}: RescheduleBookingDialogProps) {
  const queryClient = useQueryClient();

  const committed: DateRange = { from: parseISO(startDate), to: parseISO(endDate) };

  // Local draft so the in-progress (first) click renders before a full range
  // exists — same pattern as RentalDateRangePicker.
  const [draft, setDraft] = useState<DateRange | undefined>(committed);
  const [conflicts, setConflicts] = useState<AvailabilityConflict[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset to the booking's current range every time the dialog opens.
  useEffect(() => {
    if (open) {
      setDraft({ from: parseISO(startDate), to: parseISO(endDate) });
      setConflicts(null);
      setErrorMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startDate, endDate]);

  const rescheduleMutation = useMutation({
    mutationFn: async (range: { from: Date; to: Date }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('customer_reschedule_booking', {
        p_booking_id: bookingId,
        p_new_start: toIso(range.from),
        p_new_end: toIso(range.to),
      });
      if (error) throw error;
      return data as { ok: boolean; conflicts?: AvailabilityConflict[] };
    },
    onSuccess: (data) => {
      if (!data.ok) {
        setConflicts(data.conflicts ?? []);
        return;
      }
      toast.success('Dates updated! Your booking is pending re-approval by our team.');
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['customer-delivery-tasks'] });
      // A reschedule moves the booking back to pending_admin_review with new
      // dates — the admin/booker list must reflect that immediately too.
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setErrorMessage(describeSelfServiceError(error.message));
    },
  });

  const handleSelect = (range: DateRange | undefined) => {
    setDraft(range);
    setConflicts(null);
    setErrorMessage(null);
  };

  const nameFor = (equipmentId: string) =>
    items.find((i) => i.equipment_id === equipmentId)?.equipment_name ?? 'One of your items';

  const hasFullRange = Boolean(draft?.from && draft?.to);
  const isUnchanged =
    hasFullRange && toIso(draft!.from!) === startDate && toIso(draft!.to!) === endDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit">
        <DialogHeader>
          <DialogTitle>Change rental dates</DialogTitle>
          <DialogDescription>
            Current dates: {format(parseISO(startDate), 'MMM d')} –{' '}
            {format(parseISO(endDate), 'MMM d, yyyy')}. Pick a new range (minimum {MIN_NIGHTS}{' '}
            nights). We'll re-check availability for everything in this booking.
          </DialogDescription>
        </DialogHeader>

        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={draft}
          onSelect={handleSelect}
          min={MIN_NIGHTS + 1} // react-day-picker min counts days; N nights = N+1 days
          disabled={{ before: new Date() }}
          autoFocus
        />

        {conflicts && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            <p className="font-medium">
              {conflicts.length > 0
                ? 'Not everything is available on those dates:'
                : 'Those dates are not available.'}
            </p>
            <ul className="mt-1 list-disc list-inside">
              {conflicts.map((c) => (
                <li key={c.equipment_id}>
                  {nameFor(c.equipment_id)}: only {c.available} of {c.requested} available
                </li>
              ))}
            </ul>
            <p className="mt-1">Please try a different range.</p>
          </div>
        )}

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={rescheduleMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (draft?.from && draft?.to) {
                rescheduleMutation.mutate({ from: draft.from, to: draft.to });
              }
            }}
            disabled={!hasFullRange || isUnchanged || rescheduleMutation.isPending}
          >
            {rescheduleMutation.isPending ? 'Checking availability…' : 'Confirm new dates'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
