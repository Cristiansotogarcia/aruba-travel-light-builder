import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { BookingPayment, PaymentMethod, PaymentStatus } from '@/lib/payments';

// Generated Supabase types lag behind this migration, so RPCs are called via
// (supabase as any).rpc(...) — matching how the rest of the codebase handles
// not-yet-typed database objects.

export const bookingPaymentsKey = (bookingId: string) =>
  ['booking-payments', bookingId] as const;

export const useBookingPayments = (bookingId: string) => {
  return useQuery({
    queryKey: bookingPaymentsKey(bookingId),
    queryFn: async (): Promise<BookingPayment[]> => {
      const { data, error } = await (supabase as any).rpc('get_booking_payments', {
        p_booking_id: bookingId,
      });
      if (error) throw error;
      return (data ?? []) as BookingPayment[];
    },
    enabled: !!bookingId,
  });
};

interface RecordPaymentInput {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  note?: string | null;
}

interface RecordPaymentResult {
  payment_id: string;
  booking_id: string;
  payment_status: PaymentStatus;
}

export const useRecordBookingPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: RecordPaymentInput): Promise<RecordPaymentResult> => {
      const { data, error } = await (supabase as any).rpc('record_booking_payment', {
        p_booking_id: input.bookingId,
        p_amount: input.amount,
        p_method: input.method,
        p_reference: input.reference ?? null,
        p_note: input.note ?? null,
      });
      if (error) throw error;
      return data as RecordPaymentResult;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingPaymentsKey(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      // Recording a payment flips the booking's payment badge — keep the
      // customer's own dashboard in sync with the admin/accounting view.
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      toast({
        title: 'Payment recorded',
        description: `Booking marked as ${result.payment_status}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Could not record payment',
        description: error?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteBookingPayment = (bookingId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await (supabase as any).rpc('delete_booking_payment', {
        p_payment_id: paymentId,
      });
      if (error) throw error;
      return data as { booking_id: string; payment_status: PaymentStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingPaymentsKey(bookingId) });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      // Removing a payment can revert the booking's payment badge — mirror it
      // onto the customer dashboard too.
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] });
      toast({ title: 'Payment removed' });
    },
    onError: (error: any) => {
      toast({
        title: 'Could not remove payment',
        description: error?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};
