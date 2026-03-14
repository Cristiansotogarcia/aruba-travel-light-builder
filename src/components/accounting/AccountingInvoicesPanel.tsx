import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getInvoiceDisplayNumber } from '@/lib/accounting/invoices';
import type { Database } from '@/types/supabase';

type InvoiceRow = Pick<
  Database['public']['Tables']['invoices']['Row'],
  | 'booking_id'
  | 'currency_code'
  | 'customer_email'
  | 'customer_name'
  | 'id'
  | 'invoice_number'
  | 'issued_at'
  | 'payment_processed_at'
  | 'rental_end_date'
  | 'rental_start_date'
  | 'total_amount'
>;

const buildCsvValue = (value: string | number | null | undefined) =>
  `"${String(value ?? '').replaceAll('"', '""')}"`;

export const AccountingInvoicesPanel = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, booking_id, customer_email, customer_name, invoice_number, issued_at, payment_processed_at, rental_start_date, rental_end_date, total_amount, currency_code')
        .order('issued_at', { ascending: false });

      if (error) {
        throw error;
      }

      setInvoices((data || []) as InvoiceRow[]);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoice records.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInvoices();

    const subscription = supabase
      .channel('accounting-invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchInvoices)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const invoiceNumber = getInvoiceDisplayNumber(invoice.invoice_number, invoice.id).toLowerCase();
      return (
        invoiceNumber.includes(query) ||
        invoice.customer_name.toLowerCase().includes(query) ||
        invoice.customer_email.toLowerCase().includes(query) ||
        invoice.booking_id.toLowerCase().includes(query)
      );
    });
  }, [invoices, searchValue]);

  const exportInvoiceRegister = () => {
    setExporting(true);

    try {
      const header = [
        'Invoice Number',
        'Booking ID',
        'Customer Name',
        'Customer Email',
        'Rental Start',
        'Rental End',
        'Issued At',
        'Paid At',
        'Currency',
        'Total Amount',
      ];

      const rows = filteredInvoices.map((invoice) => [
        getInvoiceDisplayNumber(invoice.invoice_number, invoice.id),
        invoice.booking_id,
        invoice.customer_name,
        invoice.customer_email,
        invoice.rental_start_date,
        invoice.rental_end_date,
        invoice.issued_at,
        invoice.payment_processed_at,
        invoice.currency_code,
        Number(invoice.total_amount).toFixed(2),
      ]);

      const csvContent = [
        header.map((cell) => buildCsvValue(cell)).join(','),
        ...rows.map((row) => row.map((cell) => buildCsvValue(cell)).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = `invoice_register_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(objectUrl);

      toast({
        title: 'Export complete',
        description: `Exported ${filteredInvoices.length} invoices.`,
      });
    } catch (error) {
      console.error('Error exporting invoice register:', error);
      toast({
        title: 'Export failed',
        description: 'The invoice register could not be exported.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Search invoice history and open printable invoice PDFs for the accounting team.
          </p>
        </div>
        <Button variant="outline" onClick={exportInvoiceRegister} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export Register'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-xl">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by invoice number, customer, email, or booking id"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Invoice Register</CardTitle>
          <span className="text-sm text-muted-foreground">{filteredInvoices.length} results</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading invoice records...</p>
          ) : filteredInvoices.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No invoices match the current search.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Rental Period</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          #{getInvoiceDisplayNumber(invoice.invoice_number, invoice.id)}
                        </div>
                        <div className="text-xs text-muted-foreground">{invoice.booking_id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{invoice.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{invoice.customer_email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-foreground">
                          {new Date(invoice.rental_start_date).toLocaleDateString()} -{' '}
                          {new Date(invoice.rental_end_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-foreground">
                          {new Date(invoice.issued_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.payment_processed_at
                            ? `Paid ${new Date(invoice.payment_processed_at).toLocaleDateString()}`
                            : 'Awaiting payment date'}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {invoice.currency_code} {Number(invoice.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/invoice/${invoice.id}`, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => window.open(`/invoice/${invoice.id}?download=1`, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
