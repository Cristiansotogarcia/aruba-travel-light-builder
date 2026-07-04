import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { describeSelfServiceError } from '@/lib/customer/selfService';

interface CancelBookingDialogProps {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for cancelling a booking. The 7-day rule and ownership
 * are enforced by the customer_cancel_booking RPC; this dialog only confirms
 * intent and translates errors.
 */
export function CancelBookingDialog({ bookingId, open, onOpenChange }: CancelBookingDialogProps) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('customer_cancel_booking', {
        p_booking_id: bookingId,
      });
      if (error) throw error;
      return data as { ok: boolean };
    },
    onSuccess: () => {
      toast.success('Your booking has been cancelled.');
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['customer-delivery-tasks'] });
      // Keep the admin/booker/depot views coherent: a self-service cancel must
      // surface in the operational bookings list, not just the customer's own.
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setErrorMessage(describeSelfServiceError(error.message));
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) setErrorMessage(null);
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This releases your reserved equipment and cannot be undone. Free cancellation is
            available up to 7 days before your rental start date.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>Keep booking</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={cancelMutation.isPending}
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the RPC settles
              cancelMutation.mutate();
            }}
          >
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel booking'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
