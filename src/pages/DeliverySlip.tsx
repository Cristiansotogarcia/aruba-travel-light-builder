import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/supabase';
import { getDeliverySlipDisplayNumber } from '@/lib/delivery/serviceTasks';

type DeliverySlipRow = Database['public']['Tables']['delivery_slips']['Row'];

interface DeliverySlipLineItem {
  equipment_name: string;
  quantity: number;
  subtotal: number;
}

const DeliverySlip = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deliverySlip, setDeliverySlip] = useState<DeliverySlipRow | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSlip = async () => {
      if (!id) {
        setErrorMessage('Missing delivery slip reference.');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('delivery_slips')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          throw error || new Error('Delivery slip not found.');
        }

        setDeliverySlip(data);

        const signedUrlResult = await supabase.storage
          .from('delivery-proofs')
          .createSignedUrl(data.signature_path, 60 * 60);

        if (!signedUrlResult.error) {
          setSignatureUrl(signedUrlResult.data.signedUrl);
        }
      } catch (error) {
        console.error('Error loading delivery slip:', error);
        setErrorMessage('Unable to load delivery slip details.');
      } finally {
        setLoading(false);
      }
    };

    void loadSlip();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-4xl px-4 text-center text-muted-foreground">
          Loading delivery slip...
        </div>
      </div>
    );
  }

  if (errorMessage || !deliverySlip) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-2xl border border-border/60 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-foreground">Delivery Slip</h1>
            <p className="mt-3 text-muted-foreground">{errorMessage || 'Delivery slip not found.'}</p>
            <Button className="mt-6" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const slipNumber = getDeliverySlipDisplayNumber(deliverySlip.slip_number, deliverySlip.id);
  const deliveredAt = new Date(deliverySlip.delivered_at);
  const lineItems = Array.isArray(deliverySlip.line_items)
    ? deliverySlip.line_items as DeliverySlipLineItem[]
    : [];

  return (
    <div className="min-h-screen bg-slate-50 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Delivery Slip</h1>
            <p className="text-sm text-muted-foreground">Slip #{slipNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="flex flex-col gap-6 border-b border-border/60 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-foreground">Travel Light Aruba</h2>
              <p className="mt-1 text-sm text-muted-foreground">Proof of delivery record</p>
            </div>
            <div className="text-sm text-muted-foreground md:text-right">
              <p className="font-medium text-foreground">Slip #{slipNumber}</p>
              <p>Delivered {deliveredAt.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Delivered To</p>
              <p className="font-medium text-foreground">{deliverySlip.customer_name}</p>
              <p>{deliverySlip.customer_email}</p>
              {deliverySlip.customer_phone ? <p>{deliverySlip.customer_phone}</p> : null}
              {deliverySlip.customer_address ? <p>{deliverySlip.customer_address}</p> : null}
            </div>

            <div className="space-y-2 text-sm text-muted-foreground md:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Signed By</p>
              <p className="font-medium text-foreground">{deliverySlip.signed_by_name}</p>
              {deliverySlip.assigned_driver_name ? (
                <p>Driver: {deliverySlip.assigned_driver_name}</p>
              ) : null}
              <p>
                Rental period {new Date(deliverySlip.rental_start_date).toLocaleDateString()} -{' '}
                {new Date(deliverySlip.rental_end_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={`${item.equipment_name}-${index}`} className="border-t border-border/60">
                    <td className="px-4 py-3 text-foreground">{item.equipment_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-foreground">${Number(item.subtotal || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-md space-y-2 text-sm text-muted-foreground">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Notes</p>
              <p>{deliverySlip.notes || 'No additional delivery notes were recorded.'}</p>
            </div>

            <div className="w-full max-w-md rounded-2xl border border-border/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Customer Signature</p>
              <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-slate-50 p-4">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Customer signature" className="mx-auto h-auto w-full max-w-sm" />
                ) : (
                  <p className="text-sm text-muted-foreground">Signature preview unavailable.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-border/60 pt-4 text-sm text-muted-foreground">
            Thank you for choosing Travel Light Aruba.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliverySlip;
