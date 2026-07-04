import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  getInvoiceDisplayNumber,
  isSuccessfulBookingPaymentStatus,
} from '@/lib/accounting/invoices';
import { Booking } from './calendar/types';
import Spinner from '@/components/common/Spinner';

interface BookingDocumentsSectionProps {
  booking: Booking;
}

interface CreditNoteRow {
  id: string;
  credit_number: string;
  amount: number;
  reason: string;
}

/**
 * Invoice + credit-note summary for the admin booking detail (W5). Assigns the
 * stable sequential invoice number on demand (idempotent RPC) and links out to
 * the printable invoice, so payment (W4), fulfilment (W3) and billing docs all
 * live in the one booking view.
 */
export const BookingDocumentsSection = ({ booking }: BookingDocumentsSectionProps) => {
  const { profile } = useAuth();
  const canAssign =
    profile?.role === 'Admin' ||
    profile?.role === 'SuperUser' ||
    profile?.role === 'Accounting' ||
    profile?.role === 'Booker';
  const isPaid = isSuccessfulBookingPaymentStatus(booking.payment_status);

  const { data: invoiceNumber, isLoading: numberLoading } = useQuery({
    queryKey: ['booking-invoice-number', booking.id],
    enabled: !!booking.id && canAssign,
    queryFn: async (): Promise<string | null> => {
      // Idempotent: returns the existing number or mints INV-YYYY-NNNN.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_or_assign_invoice_number', {
        p_booking_id: booking.id,
      });
      if (error) throw error;
      return typeof data === 'string' ? data : null;
    },
  });

  const { data: creditNotes = [] } = useQuery({
    queryKey: ['booking-credit-notes', booking.id],
    enabled: !!booking.id,
    queryFn: async (): Promise<CreditNoteRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('credit_notes')
        .select('id, credit_number, amount, reason')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CreditNoteRow[];
    },
  });

  const displayNumber = getInvoiceDisplayNumber(invoiceNumber, booking.id);
  const totalCredited = creditNotes.reduce((sum, note) => sum + Number(note.amount), 0);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Invoice &amp; Documents
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Invoice Number</div>
            <div className="font-medium">
              {numberLoading ? <Spinner size="sm" /> : displayNumber}
            </div>
          </div>
          {isPaid ? (
            <Button asChild variant="outline" size="sm">
              <Link to={`/invoice/${booking.id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open invoice
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-gray-500">
              Invoice opens once the balance is fully paid.
            </span>
          )}
        </div>

        {creditNotes.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Credit Notes</div>
            {creditNotes.map((note) => (
              <div
                key={note.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{note.credit_number}</div>
                  {note.reason && (
                    <div className="text-xs text-gray-500 truncate">{note.reason}</div>
                  )}
                </div>
                <div className="font-medium text-rose-600">-${Number(note.amount).toFixed(2)}</div>
              </div>
            ))}
            <div className="flex justify-between items-center text-sm font-semibold pt-1">
              <span>Total credited</span>
              <span className="text-rose-600">-${totalCredited.toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
