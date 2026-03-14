import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Travel Light Aruba <info@travelightaruba.com>';
const REPLY_TO = 'info@travelightaruba.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_URL = Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('SITE_URL') || '';

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

interface DeliveryProofRequest {
  delivery_slip_id: string;
}

interface DeliverySlipEmailSnapshot {
  bookingId: string;
  customerAddress: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  deliveredAt: string;
  items: Array<{
    equipment_name: string;
    quantity: number;
    subtotal: number;
  }>;
  signatureUrl: string | null;
  signedByName: string;
  slipNumber: string;
  totalAmount: number;
  trackingToken: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as DeliveryProofRequest;

    if (!requestData.delivery_slip_id) {
      return new Response(JSON.stringify({ error: 'delivery_slip_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const snapshot = await resolveDeliverySlipSnapshot(requestData.delivery_slip_id);
    const subject = `Delivery Confirmed - Slip #${snapshot.slipNumber}`;
    const emailHtml = generateDeliveryProofEmail(snapshot);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== DELIVERY PROOF EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${snapshot.customerEmail}`);
      console.log(`Subject: ${subject}`);

      return new Response(
        JSON.stringify({
          message: 'Email service not configured - email logged to console',
          delivery_slip_id: requestData.delivery_slip_id,
          recipient: snapshot.customerEmail,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const emailResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [snapshot.customerEmail],
        reply_to: REPLY_TO,
        subject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const emailResult = await emailResponse.json();

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResult.id,
      recipient: snapshot.customerEmail,
      delivery_slip_id: requestData.delivery_slip_id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error sending delivery proof email:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function resolveDeliverySlipSnapshot(deliverySlipId: string): Promise<DeliverySlipEmailSnapshot> {
  if (!supabase) {
    throw new Error('Supabase service role is not configured.');
  }

  const { data: slip, error: slipError } = await supabase
    .from('delivery_slips')
    .select(`
      id,
      booking_id,
      slip_number,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      delivered_at,
      signed_by_name,
      signature_path,
      line_items,
      total_amount,
      metadata
    `)
    .eq('id', deliverySlipId)
    .single();

  if (slipError || !slip) {
    throw slipError || new Error('Delivery slip not found.');
  }

  const signedUrlResult = await supabase.storage
    .from('delivery-proofs')
    .createSignedUrl(slip.signature_path, 60 * 60 * 24 * 30);

  if (signedUrlResult.error) {
    console.error('Error creating signed URL for delivery proof:', signedUrlResult.error);
  }

  const metadata = typeof slip.metadata === 'object' && slip.metadata !== null
    ? slip.metadata as Record<string, unknown>
    : {};

  return {
    bookingId: slip.booking_id,
    customerAddress: slip.customer_address,
    customerEmail: slip.customer_email,
    customerName: slip.customer_name,
    customerPhone: slip.customer_phone,
    deliveredAt: slip.delivered_at,
    items: Array.isArray(slip.line_items) ? slip.line_items as Array<{
      equipment_name: string;
      quantity: number;
      subtotal: number;
    }> : [],
    signatureUrl: signedUrlResult.data?.signedUrl || null,
    signedByName: slip.signed_by_name,
    slipNumber: slip.slip_number,
    totalAmount: Number(slip.total_amount || 0),
    trackingToken: typeof metadata.public_tracking_token === 'string' ? metadata.public_tracking_token : null,
  };
}

function generateDeliveryProofEmail(snapshot: DeliverySlipEmailSnapshot) {
  const deliveryDate = new Date(snapshot.deliveredAt).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const trackingUrl = snapshot.trackingToken && APP_URL
    ? `${APP_URL.replace(/\/$/, '')}/track/${snapshot.trackingToken}`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proof of Delivery</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f8fafc;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;">
    <div style="background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;">Travel Light Aruba</h1>
      <p style="margin:10px 0 0;color:#dbeafe;font-size:15px;">Signed Proof of Delivery</p>
    </div>

    <div style="padding:32px 28px;">
      <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.6;">Hello ${snapshot.customerName},</p>
      <p style="margin:0 0 22px;color:#334155;font-size:16px;line-height:1.6;">
        Your delivery has been completed. A signed delivery slip has been created and stored for your booking.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Delivery Slip</p>
        <p style="margin:0;color:#0f172a;font-size:22px;font-weight:700;font-family:monospace;">${snapshot.slipNumber}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 0;color:#64748b;width:180px;">Booking Reference</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${snapshot.bookingId.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Delivered At</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${deliveryDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Signed By</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${snapshot.signedByName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Delivery Total</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">$${snapshot.totalAmount.toFixed(2)}</td>
        </tr>
      </table>

      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">Delivered Items</h2>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;">Item</th>
              <th style="text-align:left;padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;">Qty</th>
              <th style="text-align:right;padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${snapshot.items.map((item) => `<tr>
              <td style="padding:10px 0;color:#0f172a;">${item.equipment_name}</td>
              <td style="padding:10px 0;color:#334155;">${item.quantity}</td>
              <td style="padding:10px 0;color:#0f172a;text-align:right;">$${Number(item.subtotal || 0).toFixed(2)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      ${snapshot.signatureUrl ? `<div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">Customer Signature</h2>
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#ffffff;">
          <img src="${snapshot.signatureUrl}" alt="Customer signature" style="width:100%;max-width:400px;height:auto;display:block;margin:0 auto;" />
        </div>
      </div>` : ''}

      ${trackingUrl ? `<div style="margin-top:28px;">
        <a href="${trackingUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">
          Open Delivery Tracking
        </a>
      </div>` : ''}
    </div>
  </div>
</body>
</html>`;
}
