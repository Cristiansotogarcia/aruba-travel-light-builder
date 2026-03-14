import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Travel Light Aruba <info@travelightaruba.com>';
const REPLY_TO = 'info@travelightaruba.com';

interface InvoiceEmailRequest {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  processed_at: string;
  items: Array<{
    equipment_name: string;
    quantity: number;
    equipment_price: number;
    subtotal: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData: InvoiceEmailRequest = await req.json();
    const {
      booking_id,
      customer_name,
      customer_email,
      total_amount,
      processed_at,
      items
    } = requestData;

    if (!customer_email || !customer_name || !booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const emailHtml = generateInvoiceEmail({
      booking_id,
      customer_name,
      total_amount,
      processed_at,
      items
    });

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== INVOICE EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${customer_email}`);
      console.log(`Subject: Payment Confirmed - Invoice #${booking_id.slice(0, 8)}`);

      return new Response(
        JSON.stringify({
          message: 'Email service not configured - email logged to console',
          booking_id,
          customer_email
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const emailResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [customer_email],
        reply_to: REPLY_TO,
        subject: `Payment Confirmed - Invoice #${booking_id.slice(0, 8)}`,
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const emailResult = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        recipient: customer_email,
        booking_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error sending invoice email:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateInvoiceEmail(data: {
  booking_id: string;
  customer_name: string;
  total_amount: number;
  processed_at: string;
  items: Array<{
    equipment_name: string;
    quantity: number;
    equipment_price: number;
    subtotal: number;
  }>;
}): string {
  const invoiceNumber = data.booking_id.slice(0, 8).toUpperCase();
  const invoiceDate = new Date(data.processed_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const itemsRows = data.items.map((item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.equipment_name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.equipment_price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

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
        Thank you for your payment. Your booking is now confirmed. Below is your invoice for the reservation.
      </p>

      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Invoice</p>
        <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold; font-family: monospace;">#${invoiceNumber}</p>
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
            <td colspan="3" style="padding: 14px 8px 8px; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">Total Paid:</td>
            <td style="padding: 14px 8px 8px; text-align: right; font-weight: 700; color: #0f766e; font-size: 16px;">$${data.total_amount.toFixed(2)}</td>
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
