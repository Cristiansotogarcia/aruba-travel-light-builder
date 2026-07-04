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

interface InvoiceLineItem {
  equipment_name: string;
  quantity: number;
  equipment_price: number;
  subtotal: number;
}

interface InvoiceEmailRequest {
  invoice_id?: string;
  booking_id?: string;
  customer_name?: string;
  customer_email?: string;
  total_amount?: number;
  processed_at?: string;
  invoice_number?: string;
  currency_code?: string;
  items?: InvoiceLineItem[];
  delivery_fee?: number;
  items_total?: number;
}

interface InvoiceEmailSnapshot {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  currency_code: string;
  delivery_fee: number;
  invoice_number: string;
  items_total: number;
  line_items: InvoiceLineItem[];
  payment_processed_at: string;
  total_amount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData: InvoiceEmailRequest = await req.json();
    const invoice = await resolveInvoiceSnapshot(requestData);

    if (!invoice.customer_email || !invoice.customer_name || !invoice.booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required invoice fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const subject = `Payment Confirmed - Invoice #${invoice.invoice_number}`;
    const emailHtml = generateInvoiceEmail(invoice);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== INVOICE EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${invoice.customer_email}`);
      console.log(`Subject: ${subject}`);

      return new Response(
        JSON.stringify({
          message: 'Email service not configured - email logged to console',
          booking_id: invoice.booking_id,
          customer_email: invoice.customer_email,
          invoice_number: invoice.invoice_number,
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
        to: [invoice.customer_email],
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

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        recipient: invoice.customer_email,
        booking_id: invoice.booking_id,
        invoice_number: invoice.invoice_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error sending invoice email:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function resolveInvoiceSnapshot(requestData: InvoiceEmailRequest): Promise<InvoiceEmailSnapshot> {
  const { invoice_id, booking_id } = requestData;

  if (supabase && (invoice_id || booking_id)) {
    let query = supabase
      .from('invoices')
      .select(`
        booking_id,
        customer_name,
        customer_email,
        currency_code,
        delivery_fee,
        invoice_number,
        items_total,
        line_items,
        payment_processed_at,
        total_amount,
        issued_at
      `);

    query = invoice_id ? query.eq('id', invoice_id) : query.eq('booking_id', booking_id!);

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return {
        booking_id: data.booking_id,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        currency_code: data.currency_code || 'AWG',
        delivery_fee: Number(data.delivery_fee || 0),
        invoice_number: data.invoice_number,
        items_total: Number(data.items_total || 0),
        line_items: Array.isArray(data.line_items) ? data.line_items as InvoiceLineItem[] : [],
        payment_processed_at: data.payment_processed_at || data.issued_at,
        total_amount: Number(data.total_amount || 0),
      };
    }
  }

  if (!requestData.booking_id || !requestData.customer_name || !requestData.customer_email) {
    throw new Error('Invoice snapshot not found and fallback payload is incomplete.');
  }

  const fallbackItems = requestData.items || [];
  const fallbackItemsTotal = requestData.items_total
    ?? fallbackItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const fallbackDeliveryFee = requestData.delivery_fee
    ?? Math.max(Number(requestData.total_amount || 0) - fallbackItemsTotal, 0);

  return {
    booking_id: requestData.booking_id,
    customer_name: requestData.customer_name,
    customer_email: requestData.customer_email,
    currency_code: requestData.currency_code || 'AWG',
    delivery_fee: fallbackDeliveryFee,
    invoice_number: requestData.invoice_number || `TLA-${requestData.booking_id.slice(0, 8).toUpperCase()}`,
    items_total: fallbackItemsTotal,
    line_items: fallbackItems,
    payment_processed_at: requestData.processed_at || new Date().toISOString(),
    total_amount: Number(requestData.total_amount || 0),
  };
}

function generateInvoiceEmail(data: InvoiceEmailSnapshot): string {
  const invoiceDate = new Date(data.payment_processed_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsRows = data.line_items
    .map((item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.equipment_name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(data.currency_code, item.equipment_price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(data.currency_code, item.subtotal)}</td>
    </tr>
  `)
    .join('');

  const deliveryRow = data.delivery_fee > 0
    ? `
          <tr>
            <td colspan="3" style="padding: 8px; text-align: right; color: #6b7280; font-size: 14px;">Delivery Fee:</td>
            <td style="padding: 8px; text-align: right; color: #111827; font-weight: 600;">${formatCurrency(data.currency_code, data.delivery_fee)}</td>
          </tr>
      `
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); padding: 36px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">Travel Light Aruba</h1>
      <p style="color: #ccfbf1; margin: 10px 0 0; font-size: 15px;">Payment Confirmed</p>
    </div>

    <div style="padding: 32px 28px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Dear ${data.customer_name},</p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Thank you for your payment. Your invoice has been issued based on the confirmed reservation details below.
      </p>

      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Invoice</p>
        <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold; font-family: monospace;">#${data.invoice_number}</p>
        <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Issued on ${invoiceDate}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-size: 12px; border-bottom: 2px solid #e5e7eb;">Item</th>
            <th style="padding: 12px 8px; text-align: center; color: #6b7280; font-size: 12px; border-bottom: 2px solid #e5e7eb;">Qty</th>
            <th style="padding: 12px 8px; text-align: right; color: #6b7280; font-size: 12px; border-bottom: 2px solid #e5e7eb;">Price/Day</th>
            <th style="padding: 12px 8px; text-align: right; color: #6b7280; font-size: 12px; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          <tr>
            <td colspan="3" style="padding: 12px 8px 8px; text-align: right; color: #6b7280; font-size: 14px;">Items Total:</td>
            <td style="padding: 12px 8px 8px; text-align: right; color: #111827; font-weight: 600;">${formatCurrency(data.currency_code, data.items_total)}</td>
          </tr>
          ${deliveryRow}
          <tr>
            <td colspan="3" style="padding: 14px 8px 8px; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">Total Paid:</td>
            <td style="padding: 14px 8px 8px; text-align: right; font-weight: 700; color: #0f766e; font-size: 16px;">${formatCurrency(data.currency_code, data.total_amount)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin: 24px 0; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
        <p style="color: #6b7280; margin: 0; line-height: 1.6; font-size: 14px;">
          If you have any questions about this invoice, reply to this email or contact us at info@travelightaruba.com.
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Thank you for choosing Travel Light Aruba.
      </p>
    </div>

    <div style="background-color: #f3f4f6; padding: 18px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This is an automated email. Please do not reply directly to this message.
      </p>
      <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Travel Light Aruba. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function formatCurrency(currencyCode: string, amount: number): string {
  return `${currencyCode} ${Number(amount || 0).toFixed(2)}`;
}
