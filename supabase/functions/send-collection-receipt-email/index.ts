import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Travel Light Aruba <info@travelightaruba.com>';
const REPLY_TO = 'info@travelightaruba.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

interface CollectionReceiptRequest {
  collection_receipt_id: string;
}

interface CollectionReceiptEmailSnapshot {
  bookingId: string;
  collectedAt: string;
  conditionNotes: string | null;
  customerAddress: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  items: Array<{
    equipment_name: string;
    quantity: number;
    subtotal: number;
  }>;
  receiptNumber: string;
  signatureUrl: string | null;
  signedByName: string;
  totalAmount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as CollectionReceiptRequest;

    if (!requestData.collection_receipt_id) {
      return new Response(JSON.stringify({ error: 'collection_receipt_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const snapshot = await resolveCollectionReceiptSnapshot(requestData.collection_receipt_id);
    const subject = `Equipment Collected - Receipt #${snapshot.receiptNumber}`;
    const emailHtml = generateCollectionReceiptEmail(snapshot);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== COLLECTION RECEIPT EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${snapshot.customerEmail}`);
      console.log(`Subject: ${subject}`);

      return new Response(
        JSON.stringify({
          message: 'Email service not configured - email logged to console',
          collection_receipt_id: requestData.collection_receipt_id,
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
      collection_receipt_id: requestData.collection_receipt_id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error sending collection receipt email:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function resolveCollectionReceiptSnapshot(
  collectionReceiptId: string,
): Promise<CollectionReceiptEmailSnapshot> {
  if (!supabase) {
    throw new Error('Supabase service role is not configured.');
  }

  const { data: receipt, error: receiptError } = await supabase
    .from('delivery_slips')
    .select(`
      id,
      type,
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
      condition_notes
    `)
    .eq('id', collectionReceiptId)
    .eq('type', 'collection')
    .single();

  if (receiptError || !receipt) {
    throw receiptError || new Error('Collection receipt not found.');
  }

  const signedUrlResult = await supabase.storage
    .from('delivery-proofs')
    .createSignedUrl(receipt.signature_path, 60 * 60 * 24 * 30);

  if (signedUrlResult.error) {
    console.error('Error creating signed URL for collection proof:', signedUrlResult.error);
  }

  return {
    bookingId: receipt.booking_id,
    collectedAt: receipt.delivered_at,
    conditionNotes: receipt.condition_notes || null,
    customerAddress: receipt.customer_address,
    customerEmail: receipt.customer_email,
    customerName: receipt.customer_name,
    customerPhone: receipt.customer_phone,
    items: Array.isArray(receipt.line_items) ? receipt.line_items as Array<{
      equipment_name: string;
      quantity: number;
      subtotal: number;
    }> : [],
    receiptNumber: receipt.slip_number,
    signatureUrl: signedUrlResult.data?.signedUrl || null,
    signedByName: receipt.signed_by_name,
    totalAmount: Number(receipt.total_amount || 0),
  };
}

function generateCollectionReceiptEmail(snapshot: CollectionReceiptEmailSnapshot) {
  const collectionDate = new Date(snapshot.collectedAt).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collection Receipt</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f8fafc;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;">
    <div style="background:linear-gradient(135deg,#047857 0%,#065f46 100%);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;">Travel Light Aruba</h1>
      <p style="margin:10px 0 0;color:#d1fae5;font-size:15px;">Signed Collection Receipt</p>
    </div>

    <div style="padding:32px 28px;">
      <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.6;">Hello ${snapshot.customerName},</p>
      <p style="margin:0 0 22px;color:#334155;font-size:16px;line-height:1.6;">
        Your rental equipment has been collected. A signed collection receipt has been created and stored
        for your booking. Thank you for renting with us!
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Collection Receipt</p>
        <p style="margin:0;color:#0f172a;font-size:22px;font-weight:700;font-family:monospace;">${snapshot.receiptNumber}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 0;color:#64748b;width:180px;">Booking Reference</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${snapshot.bookingId.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Collected At</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${collectionDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Signed By</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${snapshot.signedByName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Rental Total</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">$${snapshot.totalAmount.toFixed(2)}</td>
        </tr>
      </table>

      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">Collected Items</h2>
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

      ${snapshot.conditionNotes ? `<div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">Equipment Condition on Return</h2>
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#f8fafc;color:#334155;font-size:15px;line-height:1.6;">
          ${snapshot.conditionNotes}
        </div>
      </div>` : ''}

      ${snapshot.signatureUrl ? `<div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">Customer Signature</h2>
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#ffffff;">
          <img src="${snapshot.signatureUrl}" alt="Customer signature" style="width:100%;max-width:400px;height:auto;display:block;margin:0 auto;" />
        </div>
      </div>` : ''}

      <p style="margin:28px 0 0;color:#64748b;font-size:14px;line-height:1.6;">
        We hope you enjoyed your stay in Aruba. We would love to see you again on your next visit!
      </p>
    </div>
  </div>
</body>
</html>`;
}
