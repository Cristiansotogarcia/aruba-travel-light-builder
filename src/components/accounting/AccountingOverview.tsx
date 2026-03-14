import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CreditCard, DollarSign, FileText, RefreshCcw, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import {
  getInvoiceDisplayNumber,
  isSuccessfulBookingPaymentStatus,
  isSuccessfulPaymentRecordStatus,
} from '@/lib/accounting/invoices';
import type { Database } from '@/types/supabase';

type BookingRow = Pick<
  Database['public']['Tables']['bookings']['Row'],
  'customer_email' | 'customer_name' | 'id' | 'payment_status' | 'status' | 'total_amount'
>;

type InvoiceRow = Pick<
  Database['public']['Tables']['invoices']['Row'],
  'currency_code' | 'customer_email' | 'customer_name' | 'id' | 'invoice_number' | 'issued_at' | 'total_amount'
>;

type PaymentRow = Pick<
  Database['public']['Tables']['payment_records']['Row'],
  | 'amount'
  | 'booking_id'
  | 'currency_code'
  | 'gross_amount'
  | 'id'
  | 'is_refund'
  | 'net_amount'
  | 'payment_method'
  | 'processed_at'
  | 'processor_fee_amount'
  | 'refund_amount'
  | 'status'
>;

interface AccountingOverviewProps {
  onNavigate?: (section: string) => void;
}

interface OverviewMetrics {
  invoiceCount: number;
  outstandingBalance: number;
  paidBookingCount: number;
  totalInvoiced: number;
  totalNetReceived: number;
  totalRefunds: number;
}

const formatCurrency = (currencyCode: string, amount: number) =>
  `${currencyCode} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const AccountingOverview = ({ onNavigate }: AccountingOverviewProps) => {
  const { toast } = useToast();
  const { getSetting } = useSystemSettings();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultCurrency = getSetting('default_currency', 'AWG');

  const fetchOverviewData = useCallback(async () => {
    setLoading(true);

    try {
      const [bookingsResult, invoicesResult, paymentsResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, customer_name, customer_email, payment_status, status, total_amount')
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('id, invoice_number, customer_name, customer_email, issued_at, total_amount, currency_code')
          .order('issued_at', { ascending: false }),
        supabase
          .from('payment_records')
          .select('id, booking_id, amount, gross_amount, processor_fee_amount, net_amount, currency_code, status, processed_at, is_refund, refund_amount, payment_method')
          .order('processed_at', { ascending: false }),
      ]);

      if (bookingsResult.error) {
        throw bookingsResult.error;
      }
      if (invoicesResult.error) {
        throw invoicesResult.error;
      }
      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      setBookings((bookingsResult.data || []) as BookingRow[]);
      setInvoices((invoicesResult.data || []) as InvoiceRow[]);
      setPayments((paymentsResult.data || []) as PaymentRow[]);
    } catch (error) {
      console.error('Error fetching accounting overview data:', error);
      toast({
        title: 'Error',
        description: 'Unable to load the accounting overview.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOverviewData();

    const bookingsSubscription = supabase
      .channel('accounting-overview-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchOverviewData)
      .subscribe();

    const invoicesSubscription = supabase
      .channel('accounting-overview-invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchOverviewData)
      .subscribe();

    const paymentsSubscription = supabase
      .channel('accounting-overview-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_records' }, fetchOverviewData)
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSubscription);
      supabase.removeChannel(invoicesSubscription);
      supabase.removeChannel(paymentsSubscription);
    };
  }, [fetchOverviewData]);

  const settledPayments = useMemo(
    () =>
      payments.filter(
        (payment) => isSuccessfulPaymentRecordStatus(payment.status) || Boolean(payment.is_refund)
      ),
    [payments]
  );

  const metrics = useMemo<OverviewMetrics>(() => {
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
    const totalNetReceived = settledPayments.reduce((sum, payment) => {
      const gross = Number(payment.gross_amount ?? payment.amount ?? 0);
      const fees = Number(payment.processor_fee_amount ?? 0);
      const net = Number(payment.net_amount ?? (gross - fees));

      return sum + net;
    }, 0);
    const totalRefunds = settledPayments.reduce((sum, payment) => {
      if (!payment.is_refund) {
        return sum;
      }

      return sum + Number(payment.refund_amount ?? payment.gross_amount ?? payment.amount ?? 0);
    }, 0);
    const outstandingBookings = bookings.filter(
      (booking) => !isSuccessfulBookingPaymentStatus(booking.payment_status)
    );
    const outstandingBalance = outstandingBookings.reduce(
      (sum, booking) => sum + Number(booking.total_amount || 0),
      0
    );
    const paidBookingCount = bookings.filter((booking) =>
      isSuccessfulBookingPaymentStatus(booking.payment_status)
    ).length;

    return {
      invoiceCount: invoices.length,
      outstandingBalance,
      paidBookingCount,
      totalInvoiced,
      totalNetReceived,
      totalRefunds,
    };
  }, [bookings, invoices, settledPayments]);

  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);
  const recentSettlements = useMemo(() => {
    const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));

    return settledPayments.slice(0, 5).map((payment) => ({
      payment,
      booking: bookingsById.get(payment.booking_id),
    }));
  }, [bookings, settledPayments]);

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-6 flex items-center justify-center gap-3 text-muted-foreground">
            <RefreshCcw className="h-4 w-4 animate-spin" />
            <span>Loading accounting overview...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Accounting Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Revenue, settlements, open balances, and issued invoices in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onNavigate?.('transactions')}>
            Review Transactions
          </Button>
          <Button onClick={() => onNavigate?.('invoices')}>Open Invoices</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoiced</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(defaultCurrency, metrics.totalInvoiced)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.invoiceCount} issued invoices
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Received</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(defaultCurrency, metrics.totalNetReceived)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {settledPayments.length} settled transactions
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(defaultCurrency, metrics.outstandingBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bookings.length - metrics.paidBookingCount} bookings not fully paid
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Refunds</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(defaultCurrency, metrics.totalRefunds)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tracked across successful and refund events
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('invoices')}>
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices have been issued yet.</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      Invoice #{getInvoiceDisplayNumber(invoice.invoice_number, invoice.id)}
                    </p>
                    <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Issued {new Date(invoice.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">
                      {formatCurrency(invoice.currency_code || defaultCurrency, Number(invoice.total_amount || 0))}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/invoice/${invoice.id}`, '_blank')}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(`/invoice/${invoice.id}?download=1`, '_blank')}
                    >
                      PDF
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Latest Settlements</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('transactions')}>
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSettlements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment settlements are available yet.</p>
            ) : (
              recentSettlements.map(({ payment, booking }) => {
                const gross = Number(payment.gross_amount ?? payment.amount ?? 0);
                const fees = Number(payment.processor_fee_amount ?? 0);
                const net = Number(payment.net_amount ?? (gross - fees));
                const statusLabel = payment.is_refund ? 'Refund' : payment.status;

                return (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {booking?.customer_name || 'Unknown customer'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking?.customer_email || payment.booking_id}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {payment.processed_at
                          ? new Date(payment.processed_at).toLocaleDateString()
                          : 'Pending processing'}
                        {payment.payment_method ? ` • ${payment.payment_method}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{statusLabel}</p>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(payment.currency_code || defaultCurrency, net)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Gross {formatCurrency(payment.currency_code || defaultCurrency, gross)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
