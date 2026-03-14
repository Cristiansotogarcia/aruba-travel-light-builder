import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  getInvoiceDisplayNumber,
  isSuccessfulBookingPaymentStatus,
  type InvoiceLineItem,
  type InvoiceSnapshot,
} from '@/lib/accounting/invoices';

const toInvoiceLineItems = (value: unknown): InvoiceLineItem[] =>
  Array.isArray(value) ? (value as InvoiceLineItem[]) : [];

const Invoice = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<InvoiceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        setErrorMessage('Missing invoice reference.');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            id,
            booking_id,
            payment_record_id,
            invoice_number,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            rental_start_date,
            rental_end_date,
            currency_code,
            items_total,
            delivery_fee,
            total_amount,
            payment_status,
            payment_processed_at,
            issued_at,
            line_items
          `)
          .or(`id.eq.${id},booking_id.eq.${id}`)
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          setErrorMessage('Invoice not found.');
          return;
        }

        setInvoice({
          ...data,
          line_items: toInvoiceLineItems(data.line_items),
        } as InvoiceSnapshot);
      } catch (error) {
        console.error('Error loading invoice:', error);
        setErrorMessage('Unable to load invoice details.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorMessage || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {errorMessage || 'Invoice not found.'}
      </div>
    );
  }

  const invoiceNumber = getInvoiceDisplayNumber(invoice.invoice_number, invoice.id);
  const invoiceDate = new Date(invoice.payment_processed_at || invoice.issued_at);
  const formattedDate = invoiceDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const paymentLabel = isSuccessfulBookingPaymentStatus(invoice.payment_status) ? 'Paid' : 'Pending';

  return (
    <div className="min-h-screen bg-slate-50 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Invoice</h1>
            <p className="text-sm text-muted-foreground">Invoice #{invoiceNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              Download PDF
            </Button>
            <Button asChild variant="ghost">
              <Link to="/admin">Back to dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-2xl border border-border/60 p-8 print:border-0 print:shadow-none print:rounded-none">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Travel Light Aruba</p>
              <h2 className="text-2xl font-semibold text-foreground mt-2">Invoice</h2>
              <p className="text-sm text-muted-foreground mt-1">Invoice #{invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="text-base font-semibold text-foreground">{formattedDate}</p>
              <p className="text-sm text-muted-foreground mt-2">Payment Status</p>
              <p className="text-base font-semibold text-foreground">{paymentLabel}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Billed To</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{invoice.customer_name}</p>
                <p>{invoice.customer_email}</p>
                {invoice.customer_phone ? <p>{invoice.customer_phone}</p> : null}
                {invoice.customer_address ? <p>{invoice.customer_address}</p> : null}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Rental Period</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  {new Date(invoice.rental_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} -
                  {` ${new Date(invoice.rental_end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-foreground mb-3">Invoice Items</h3>
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">
                <span className="col-span-2">Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Subtotal</span>
              </div>
              <div className="divide-y divide-border/60">
                {invoice.line_items.map((item, index) => (
                  <div key={`${item.equipment_name}-${index}`} className="grid grid-cols-4 px-4 py-3 text-sm">
                    <div className="col-span-2">
                      <p className="font-medium text-foreground">{item.equipment_name}</p>
                      <p className="text-xs text-muted-foreground">${Number(item.equipment_price).toFixed(2)} / day</p>
                    </div>
                    <div className="text-center text-foreground">{item.quantity}</div>
                    <div className="text-right text-foreground">${Number(item.subtotal).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-xs space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Items Total</span>
                <span className="font-medium text-foreground">${Number(invoice.items_total).toFixed(2)}</span>
              </div>
              {Number(invoice.delivery_fee) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-medium text-foreground">${Number(invoice.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-lg font-semibold text-foreground">${Number(invoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 text-xs text-muted-foreground">
            Thank you for choosing Travel Light Aruba. If you have any questions about this invoice, reply to
            info@travelightaruba.com.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
