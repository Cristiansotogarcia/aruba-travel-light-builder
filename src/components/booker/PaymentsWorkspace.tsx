import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, Mail, Send } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookingPaymentsSection } from '@/components/admin/BookingPaymentsSection';
import {
  getPaymentStatusColor,
  getPaymentStatusLabel,
  getStatusColor,
  getStatusLabel,
} from '@/components/admin/calendar/statusUtils';
import type { Booking } from '@/components/admin/calendar/types';
import { BookingListSkeleton } from '@/components/common/SkeletonLoader';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isSuccessfulBookingPaymentStatus } from '@/lib/accounting/invoices';

/** Statuses that still expect a customer payment (awaiting-payment funnel). */
const AWAITING_PAYMENT_STATUSES = ['pending', 'confirmed'] as const;

interface PaymentWorkspaceItem {
  equipment_name: string;
  quantity: number;
}

interface PaymentWorkspaceBooking {
  id: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  end_date: string;
  payment_link_url: string | null;
  payment_status: string | null;
  start_date: string;
  status: string;
  total_amount: number;
  booking_items: PaymentWorkspaceItem[];
}

const PAYMENTS_QUERY_KEY = ['booker-payments-workspace'] as const;

/**
 * Booker-facing Payments workspace: every booking that still owes money.
 * Opening a row exposes the manual-payment ledger (W4 BookingPaymentsSection)
 * and a "Send payment link" action so an awaiting-payment order no longer
 * dead-ends — the Booker can record a payment or email the customer a link.
 */
export const PaymentsWorkspace = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PaymentWorkspaceBooking | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: PAYMENTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_email,
          customer_name,
          customer_phone,
          customer_address,
          end_date,
          payment_link_url,
          payment_status,
          start_date,
          status,
          total_amount,
          booking_items ( equipment_name, quantity )
        `)
        .in('status', [...AWAITING_PAYMENT_STATUSES])
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Generated Supabase types predate payment_link_url on this select shape.
      return ((data || []) as unknown as PaymentWorkspaceBooking[]).filter(
        (booking) => !isSuccessfulBookingPaymentStatus(booking.payment_status),
      );
    },
    staleTime: 30 * 1000,
  });

  const outstandingTotal = useMemo(
    () => bookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0),
    [bookings],
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ['booker-workspace-bookings'] });
  };

  if (isLoading) {
    return <BookingListSkeleton count={5} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <p className="text-sm text-muted-foreground">Total awaiting payment</p>
          <p className="text-2xl font-semibold text-foreground">
            ${outstandingTotal.toFixed(2)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              across {bookings.length} booking{bookings.length === 1 ? '' : 's'}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Awaiting Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No bookings are awaiting payment right now.
            </p>
          ) : (
            bookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelected(booking)}
                className="group flex w-full flex-col gap-3 rounded-xl border border-border/60 p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-foreground">{booking.customer_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{booking.customer_email}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(booking.start_date).toLocaleDateString()} -{' '}
                    {new Date(booking.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:text-right">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                    <Badge className={getPaymentStatusColor(booking.payment_status)}>
                      {getPaymentStatusLabel(booking.payment_status)}
                    </Badge>
                  </div>
                  <p className="font-semibold text-foreground">
                    ${Number(booking.total_amount).toFixed(2)}
                  </p>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {selected && (
        <PaymentDetailDialog
          key={selected.id}
          booking={selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onChanged={refresh}
          toast={toast}
        />
      )}
    </div>
  );
};

interface PaymentDetailDialogProps {
  booking: PaymentWorkspaceBooking;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  toast: ReturnType<typeof useToast>['toast'];
}

const PaymentDetailDialog = ({
  booking,
  onOpenChange,
  onChanged,
  toast,
}: PaymentDetailDialogProps) => {
  // Remounted per booking (keyed by the parent), so seeding from props is safe.
  const [paymentLink, setPaymentLink] = useState(booking.payment_link_url ?? '');
  const [sending, setSending] = useState(false);

  const linkValid = /^https?:\/\/\S+$/i.test(paymentLink.trim());

  const handleSendPaymentLink = async () => {
    const link = paymentLink.trim();
    if (!linkValid) {
      toast({
        title: 'Payment link required',
        description: 'Enter a valid http(s) payment link before sending.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      // Persist the link on the booking so it is auditable and reusable
      // (Bookers hold an UPDATE policy on bookings).
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_link_url: link,
          payment_link_generated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (updateError) {
        throw updateError;
      }

      const { error: emailError } = await supabase.functions.invoke('send-payment-link-email', {
        body: {
          booking_id: booking.id,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          payment_link: link,
          total_amount: Number(booking.total_amount),
        },
      });

      if (emailError) {
        throw emailError;
      }

      toast({
        title: 'Payment link sent',
        description: `Emailed ${booking.customer_email}.`,
      });
      onChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      toast({
        title: 'Could not send payment link',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // BookingPaymentsSection only reads id / total_amount / payment_status.
  const paymentBooking = {
    id: booking.id,
    total_amount: booking.total_amount,
    payment_status: booking.payment_status,
  } as unknown as Booking;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="border-b border-border/60 px-4 py-3 sm:px-6">
          <DialogTitle className="text-base sm:text-lg">
            Booking #{booking.id.slice(0, 8)}
          </DialogTitle>
          <DialogDescription>{booking.customer_name} · {booking.customer_email}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {/* Summary */}
          <div className="space-y-2 rounded-xl border border-border/60 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getStatusColor(booking.status)}>{getStatusLabel(booking.status)}</Badge>
              <Badge className={getPaymentStatusColor(booking.payment_status)}>
                {getPaymentStatusLabel(booking.payment_status)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {new Date(booking.start_date).toLocaleDateString()} -{' '}
              {new Date(booking.end_date).toLocaleDateString()}
            </p>
            <ul className="list-inside list-disc text-muted-foreground">
              {booking.booking_items?.map((item, index) => (
                <li key={index}>
                  {item.equipment_name} (x{item.quantity})
                </li>
              ))}
            </ul>
            <p className="font-semibold text-foreground">Total ${Number(booking.total_amount).toFixed(2)}</p>
          </div>

          {/* W4 manual-payment ledger */}
          <BookingPaymentsSection booking={paymentBooking} />

          {/* Send payment link */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <Mail className="h-4 w-4" />
                Send payment link
              </h3>
              <p className="text-sm text-muted-foreground">
                Email the customer a hosted payment link (bank / PayPal). The link is stored on the
                booking for reference.
              </p>
              <div>
                <Label htmlFor="booker-payment-link">Payment link URL</Label>
                <Input
                  id="booker-payment-link"
                  type="url"
                  inputMode="url"
                  placeholder="https://..."
                  value={paymentLink}
                  onChange={(event) => setPaymentLink(event.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSendPaymentLink} disabled={!linkValid || sending} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send payment link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentsWorkspace;
