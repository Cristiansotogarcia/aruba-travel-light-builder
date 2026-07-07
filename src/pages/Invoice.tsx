import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import {
  getInvoiceDisplayNumber,
  isSuccessfulBookingPaymentStatus,
  type InvoiceLineItem,
  type InvoiceSnapshot,
} from '@/lib/accounting/invoices';
import { computeInclusiveTax, parseTaxRate } from '@/utils/invoice';

interface CreditNoteRow {
  id: string;
  credit_number: string;
  amount: number;
  reason: string;
  created_at: string;
}

const toInvoiceLineItems = (value: unknown): InvoiceLineItem[] =>
  Array.isArray(value) ? (value as InvoiceLineItem[]) : [];

const Invoice = () => {
  const { id } = useParams();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceSnapshot | null>(null);
  const [creditNotes, setCreditNotes] = useState<CreditNoteRow[]>([]);
  const [assignedNumber, setAssignedNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { getSetting } = useSystemSettings();
  const shouldAutoPrint = searchParams.get('download') === '1';

  // Roles the get_or_assign_invoice_number RPC accepts (mirrors the SQL guard).
  const canAssignInvoiceNumber =
    profile?.role === 'Admin' ||
    profile?.role === 'SuperUser' ||
    profile?.role === 'Accounting' ||
    profile?.role === 'Booker';

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

  useEffect(() => {
    const fetchCreditNotes = async () => {
      if (!invoice?.booking_id) {
        return;
      }

      // RLS restricts credit notes to Accounting/Admin/SuperUser; other viewers
      // simply get an empty list.
      const { data, error } = await (supabase as any)
        .from('credit_notes')
        .select('id, credit_number, amount, reason, created_at')
        .eq('booking_id', invoice.booking_id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setCreditNotes(data as CreditNoteRow[]);
      }
    };

    fetchCreditNotes();
  }, [invoice?.booking_id]);

  // Ensure the booking carries a stable sequential invoice number (INV-YYYY-NNNN)
  // the first time an authorized user opens/prints it — no manual step required.
  // The RPC is idempotent (returns the existing number on repeat calls) and
  // guarded to Admin/SuperUser/Accounting/Booker, so customer/driver viewers
  // simply keep the display fallback.
  useEffect(() => {
    const assignNumber = async () => {
      if (!invoice?.booking_id || !canAssignInvoiceNumber) {
        return;
      }
      if (invoice.invoice_number && invoice.invoice_number.trim()) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_or_assign_invoice_number', {
        p_booking_id: invoice.booking_id,
      });

      if (!error && typeof data === 'string' && data.trim()) {
        setAssignedNumber(data);
      }
    };

    void assignNumber();
  }, [invoice?.booking_id, invoice?.invoice_number, canAssignInvoiceNumber]);

  useEffect(() => {
    if (!invoice || !shouldAutoPrint) {
      return;
    }

    // Don't print before the sequential number has settled, or the PDF would
    // capture the TLA- fallback instead of the real INV number.
    const numberSettled =
      Boolean(invoice.invoice_number?.trim()) || Boolean(assignedNumber) || !canAssignInvoiceNumber;
    if (!numberSettled) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [invoice, shouldAutoPrint, assignedNumber, canAssignInvoiceNumber]);

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

  const invoiceNumber = getInvoiceDisplayNumber(
    invoice.invoice_number?.trim() || assignedNumber,
    invoice.id,
  );
  const invoiceDate = new Date(invoice.payment_processed_at || invoice.issued_at);
  const formattedDate = invoiceDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const paymentLabel = isSuccessfulBookingPaymentStatus(invoice.payment_status) ? 'Paid' : 'Pending';
  const backTarget = profile?.role === 'Accounting' ? '/accounting' : '/admin';
  const backLabel = profile?.role === 'Accounting' ? 'Back to accounting' : 'Back to dashboard';

  // Turnover tax (BBO/BAZV/BAVP) is displayed tax-inclusively: the charged total
  // stays unchanged and we surface the embedded tax when a rate is configured.
  const taxRate = parseTaxRate(getSetting('invoice_tax_rate_percent', '0'));
  const taxLabel = getSetting('invoice_tax_label', 'BBO/BAZV/BAVP') || 'BBO/BAZV/BAVP';
  const { taxAmount } = computeInclusiveTax(Number(invoice.total_amount), taxRate);
  const totalCredited = creditNotes.reduce((sum, note) => sum + Number(note.amount), 0);
  const balanceAfterCredits = Number(invoice.total_amount) - totalCredited;

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
              <Link to={backTarget}>{backLabel}</Link>
            </Button>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-2xl border border-border/60 p-8 print:border-0 print:shadow-none print:rounded-none">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <img
                src="https://imagedelivery.net/KE7oljFadxNqgUvpxIG0Zg/b0ed7b8f-a7a0-4a00-810f-8b0f02e46500/w=200"
                alt="Travel Light Aruba"
                className="h-14 w-auto"
              />
              <h2 className="text-2xl font-semibold text-foreground mt-4">Invoice</h2>
              <p className="text-sm text-muted-foreground mt-1">Invoice #{invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">Travel Light Aruba</p>
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <p>{getSetting('store_address', 'Caya Taratata 15, Unit 11 (Coral Plaza)')}</p>
                <p>Aruba</p>
                <p>+297 593-2028</p>
                <p>info@travelightaruba.com</p>
              </div>
              <p className="text-sm text-muted-foreground mt-3">Invoice Date</p>
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
              {taxRate > 0 && taxAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Includes {taxLabel} ({taxRate}%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              {creditNotes.length > 0 && (
                <>
                  {creditNotes.map((note) => (
                    <div key={note.id} className="flex items-center justify-between text-red-600">
                      <span>
                        Credit Note {note.credit_number}
                        {note.reason ? (
                          <span className="block text-xs text-muted-foreground">{note.reason}</span>
                        ) : null}
                      </span>
                      <span className="font-medium">-${Number(note.amount).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="font-semibold text-foreground">Balance After Credits</span>
                    <span className="text-lg font-semibold text-foreground">${balanceAfterCredits.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-10 text-xs text-muted-foreground">
            Thank you for choosing Travel Light Aruba. If you have any questions about this invoice, reply to
            info@travelightaruba.com.
          </div>
          {(getSetting('company_registration_number', '').trim() ||
            getSetting('company_tax_number', '').trim()) && (
            <div className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              {getSetting('company_registration_number', '').trim() && (
                <span>KvK Aruba: {getSetting('company_registration_number', '')}</span>
              )}
              {getSetting('company_registration_number', '').trim() &&
                getSetting('company_tax_number', '').trim() && <span> · </span>}
              {getSetting('company_tax_number', '').trim() && (
                <span>Tax ID (CRIB): {getSetting('company_tax_number', '')}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoice;
