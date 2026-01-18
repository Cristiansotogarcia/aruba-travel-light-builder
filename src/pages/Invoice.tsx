import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface InvoiceItem {
  equipment_name: string;
  quantity: number;
  equipment_price: number;
  subtotal: number;
}

interface InvoiceBooking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
  booking_items: InvoiceItem[];
}

const Invoice = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState<InvoiceBooking | null>(null);
  const [paymentDate, setPaymentDate] = useState<string | null>(null);
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
        const { data: bookingData, error } = await supabase
          .from('bookings')
          .select(`
            id,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            start_date,
            end_date,
            total_amount,
            payment_status,
            created_at,
            updated_at,
            booking_items (
              equipment_name,
              quantity,
              equipment_price,
              subtotal
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        const { data: paymentRecord } = await supabase
          .from('payment_records')
          .select('processed_at')
          .eq('booking_id', id)
          .order('processed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setBooking(bookingData as InvoiceBooking);
        setPaymentDate(paymentRecord?.processed_at || bookingData.updated_at);
      } catch (error) {
        console.error('Error loading invoice:', error);
        setErrorMessage('Unable to load invoice details.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  const itemsTotal = useMemo(() => {
    if (!booking?.booking_items) return 0;
    return booking.booking_items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  }, [booking]);

  const deliveryFee = useMemo(() => {
    if (!booking) return 0;
    const fee = Number(booking.total_amount) - itemsTotal;
    return fee > 0 ? fee : 0;
  }, [booking, itemsTotal]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorMessage || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {errorMessage || 'Invoice not found.'}
      </div>
    );
  }

  const invoiceNumber = booking.id.substring(0, 8).toUpperCase();
  const invoiceDate = paymentDate ? new Date(paymentDate) : new Date(booking.updated_at);
  const formattedDate = invoiceDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

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
              <p className="text-base font-semibold text-foreground">
                {booking.payment_status === 'paid' ? 'Paid' : 'Pending'}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Billed To</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{booking.customer_name}</p>
                <p>{booking.customer_email}</p>
                <p>{booking.customer_phone}</p>
                <p>{booking.customer_address}</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Rental Period</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  {new Date(booking.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} -
                  {` ${new Date(booking.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
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
                {booking.booking_items.map((item, index) => (
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
                <span className="font-medium text-foreground">${itemsTotal.toFixed(2)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-medium text-foreground">${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-lg font-semibold text-foreground">${Number(booking.total_amount).toFixed(2)}</span>
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
