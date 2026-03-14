import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { format, parseISO, subDays } from '@/utils/dateUtils';
import { Download, DollarSign, TrendingUp, CreditCard, FileSpreadsheet, CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';

interface PaymentRecord {
  id: string;
  booking_id: string;
  amount: number;
  gross_amount: number | null;
  processor_fee_percent: number | null;
  processor_fee_amount: number | null;
  net_amount: number | null;
  currency_code: string | null;
  status: string;
  processed_at: string | null;
  settlement_date: string | null;
  is_refund: boolean | null;
  refund_amount: number | null;
  payment_method: string | null;
  card_last_four: string | null;
}

interface BookingWithPayment {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  start_date: string;
  total_amount: number;
  payment: PaymentRecord | null;
}

interface AccountingSummary {
  totalGross: number;
  totalFees: number;
  totalNet: number;
  totalRefunds: number;
  transactionCount: number;
  averageTransaction: number;
  averageFeePercent: number;
}

export const AccountingReports: React.FC = () => {
  const { toast } = useToast();
  const { getNumericSetting, getSetting } = useSystemSettings();
  const processorFeePercent = getNumericSetting('processor_fee_percent', 3.99);
  const defaultCurrency = getSetting('default_currency', 'AWG');

  const [bookings, setBookings] = useState<BookingWithPayment[]>([]);
  const [summary, setSummary] = useState<AccountingSummary>({
    totalGross: 0,
    totalFees: 0,
    totalNet: 0,
    totalRefunds: 0,
    transactionCount: 0,
    averageTransaction: 0,
    averageFeePercent: 0
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [exporting, setExporting] = useState(false);

  const fetchAccountingData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payment_records')
        .select('*')
        .order('processed_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('processed_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('processed_at', dateRange.to.toISOString());
      }

      const { data: paymentsData, error: paymentsError } = await query;

      if (paymentsError) throw paymentsError;

      const typedPayments = (paymentsData || []) as PaymentRecord[];

      // Calculate summary
      let totalGross = 0;
      let totalFees = 0;
      let totalNet = 0;
      let totalRefunds = 0;

      typedPayments.forEach(p => {
        const gross = p.gross_amount ?? p.amount;
        const fee = p.processor_fee_amount ?? (gross * processorFeePercent / 100);
        const net = p.net_amount ?? (gross - fee);
        const refund = p.is_refund ? (p.refund_amount ?? gross) : 0;

        totalGross += gross;
        totalFees += fee;
        totalNet += net;
        totalRefunds += refund;
      });

      const count = typedPayments.length;
      setSummary({
        totalGross: Math.round(totalGross * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        totalRefunds: Math.round(totalRefunds * 100) / 100,
        transactionCount: count,
        averageTransaction: count > 0 ? Math.round(totalGross / count * 100) / 100 : 0,
        averageFeePercent: processorFeePercent
      });

      // Fetch bookings with payment info
      const bookingIds = [...new Set(typedPayments.map(p => p.booking_id))];
      if (bookingIds.length > 0) {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('id, customer_name, customer_email, start_date, total_amount')
          .in('id', bookingIds);

        const bookingsWithPayments = (bookingsData || []).map(b => ({
          booking_id: b.id,
          customer_name: b.customer_name,
          customer_email: b.customer_email,
          start_date: b.start_date,
          total_amount: b.total_amount,
          payment: typedPayments.find(p => p.booking_id === b.id) || null
        }));

        setBookings(bookingsWithPayments);
      }

    } catch (error) {
      console.error('Error fetching accounting data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, processorFeePercent]);

  useEffect(() => {
    fetchAccountingData();
  }, [fetchAccountingData]);

  // Export to CSV
  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = [
        'Booking ID',
        'Customer Name',
        'Customer Email',
        'Booking Date',
        'Gross Amount',
        'Processor Fee %',
        'Processor Fee',
        'Net Received',
        'Refund Amount',
        'Settlement Date',
        'Payment Status',
        'Payment Method'
      ];

      const rows = bookings.map(b => {
        const p = b.payment;
        const gross = p?.gross_amount ?? b.total_amount;
        const feePercent = p?.processor_fee_percent ?? processorFeePercent;
        const feeAmount = p?.processor_fee_amount ?? (gross * feePercent / 100);
        const net = p?.net_amount ?? (gross - feeAmount);
        const refund = p?.is_refund ? (p.refund_amount ?? 0) : 0;

        return [
          b.booking_id,
          b.customer_name,
          b.customer_email,
          b.start_date,
          gross.toFixed(2),
          feePercent.toFixed(2),
          feeAmount.toFixed(2),
          net.toFixed(2),
          refund.toFixed(2),
          p?.settlement_date || '',
          p?.status || '',
          p?.payment_method || ''
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `accounting_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      toast({
        title: 'Export Complete',
        description: `Exported ${bookings.length} transactions to CSV`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export accounting data',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  // Export to Excel-compatible format (tab-separated for better Excel compatibility)
  const exportToExcel = () => {
    setExporting(true);
    try {
      const headers = [
        'Booking ID',
        'Customer Name',
        'Customer Email',
        'Booking Date',
        'Gross Amount',
        'Processor Fee %',
        'Processor Fee',
        'Net Received',
        'Refund Amount',
        'Settlement Date',
        'Payment Status',
        'Payment Method'
      ];

      const rows = bookings.map(b => {
        const p = b.payment;
        const gross = p?.gross_amount ?? b.total_amount;
        const feePercent = p?.processor_fee_percent ?? processorFeePercent;
        const feeAmount = p?.processor_fee_amount ?? (gross * feePercent / 100);
        const net = p?.net_amount ?? (gross - feeAmount);
        const refund = p?.is_refund ? (p.refund_amount ?? 0) : 0;

        return [
          b.booking_id,
          b.customer_name,
          b.customer_email,
          b.start_date,
          gross.toFixed(2),
          feePercent.toFixed(2),
          feeAmount.toFixed(2),
          net.toFixed(2),
          refund.toFixed(2),
          p?.settlement_date || '',
          p?.status || '',
          p?.payment_method || ''
        ];
      });

      const tsvContent = [
        headers.join('\t'),
        ...rows.map(row => row.join('\t'))
      ].join('\n');

      const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `accounting_report_${format(new Date(), 'yyyy-MM-dd')}.xls`;
      link.click();

      toast({
        title: 'Export Complete',
        description: `Exported ${bookings.length} transactions to Excel format`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export accounting data',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading accounting data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Accounting Reports
          </h1>
          <p className="text-gray-600 mt-1">
            Financial reconciliation and payment tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" onClick={exportToExcel} disabled={exporting}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-[300px] justify-start text-left font-normal ${!dateRange && "text-muted-foreground"}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {defaultCurrency} {summary.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.transactionCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processor Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{defaultCurrency} {summary.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              @ {summary.averageFeePercent}% rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {defaultCurrency} {summary.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              After processor fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refunds</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              -{defaultCurrency} {summary.totalRefunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total refunds issued
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            Detailed breakdown of all payments and fees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Gross Amount</TableHead>
                <TableHead>Fee %</TableHead>
                <TableHead>Fee Amount</TableHead>
                <TableHead>Net Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No payment records found for the selected date range
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => {
                  const p = booking.payment;
                  const gross = p?.gross_amount ?? booking.total_amount;
                  const feePercent = p?.processor_fee_percent ?? processorFeePercent;
                  const feeAmount = p?.processor_fee_amount ?? (gross * feePercent / 100);
                  const net = p?.net_amount ?? (gross - feeAmount);

                  return (
                    <TableRow key={booking.booking_id}>
                      <TableCell>{format(parseISO(booking.start_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{booking.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{booking.customer_email}</div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {defaultCurrency} {gross.toFixed(2)}
                      </TableCell>
                      <TableCell>{feePercent.toFixed(2)}%</TableCell>
                      <TableCell className="text-red-600">
                        -{defaultCurrency} {feeAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {defaultCurrency} {net.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          p?.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {p?.status || 'pending'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountingReports;