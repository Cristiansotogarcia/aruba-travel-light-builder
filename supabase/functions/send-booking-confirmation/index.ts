import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

// Sends a "Reservation received" confirmation email to the customer right
// after a booking is created. Invoked fire-and-forget from the client with
// { booking_id } only — all booking data is loaded server-side with the
// service role key so the caller cannot influence the email content.
//
// Secrets (already configured for sibling functions — nothing new added):
//   RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Travel Light Aruba <info@travelightaruba.com>';
const REPLY_TO = 'info@travelightaruba.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// Store pickup location (matches the store location card on the site).
const STORE_NAME = 'Travel Light Aruba';
const STORE_ADDRESS = 'Caya Taratata 15, Unit 11, Coral Plaza';

interface BookingConfirmationRequest {
  booking_id: string;
}

interface BookingItemRow {
  equipment_name: string;
  quantity: number;
  equipment_price: number;
  subtotal: number;
}

interface BookingRow {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_address: string | null;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  fulfillment_method: 'delivery' | 'pickup' | null;
  pickup_code: string | null;
  delivery_slot: string | null;
  pickup_slot: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Never leak internals to the caller — generic failure body only.
  const genericFailure = (status: number) =>
    new Response(JSON.stringify({ error: 'Could not send confirmation email' }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    let requestData: BookingConfirmationRequest;
    try {
      requestData = await req.json() as BookingConfirmationRequest;
    } catch {
      return genericFailure(400);
    }

    if (!requestData.booking_id || typeof requestData.booking_id !== 'string') {
      return genericFailure(400);
    }

    if (!supabase) {
      console.error('send-booking-confirmation: Supabase service role is not configured');
      return genericFailure(500);
    }

    // Load booking server-side (service role bypasses RLS).
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_name, customer_email, customer_address, start_date, end_date, total_amount, status, fulfillment_method, pickup_code, delivery_slot, pickup_slot')
      .eq('id', requestData.booking_id)
      .single<BookingRow>();

    if (bookingError || !booking) {
      console.error('send-booking-confirmation: booking not found', requestData.booking_id, bookingError?.message);
      return genericFailure(404);
    }

    if (!booking.customer_email) {
      console.error('send-booking-confirmation: booking has no customer_email', booking.id);
      return genericFailure(422);
    }

    // Load line items (best effort — email is still useful without them).
    const { data: itemRows, error: itemsError } = await supabase
      .from('booking_items')
      .select('equipment_name, quantity, equipment_price, subtotal')
      .eq('booking_id', booking.id);

    if (itemsError) {
      console.error('send-booking-confirmation: failed to load items', booking.id, itemsError.message);
    }
    const items: BookingItemRow[] = (itemRows as BookingItemRow[] | null) ?? [];

    const bookingRef = booking.id.slice(0, 8).toUpperCase();
    const subject = `Reservation Received - Booking #${bookingRef}`;
    const emailHtml = generateConfirmationEmail(booking, items);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== BOOKING CONFIRMATION EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${booking.customer_email}`);
      console.log(`Subject: ${subject}`);

      return new Response(
        JSON.stringify({
          message: 'Email service not configured - email logged to console',
          booking_id: booking.id,
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
        to: [booking.customer_email],
        reply_to: REPLY_TO,
        subject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('send-booking-confirmation: Resend API error', emailResponse.status, errorText);
      return genericFailure(502);
    }

    const emailResult = await emailResponse.json();
    console.log('send-booking-confirmation: email sent', booking.id, emailResult?.id);

    return new Response(JSON.stringify({ success: true, booking_id: booking.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('send-booking-confirmation: unexpected error', error);
    return genericFailure(500);
  }
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return escapeHtml(value);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatSlot(slot: string | null): string {
  if (slot === 'morning') return 'Morning (9AM - 12PM)';
  if (slot === 'afternoon') return 'Afternoon (1PM - 5PM)';
  return '';
}

function generateConfirmationEmail(booking: BookingRow, items: BookingItemRow[]): string {
  const isPickup = booking.fulfillment_method === 'pickup';
  const bookingRef = booking.id.slice(0, 8).toUpperCase();
  const customerName = escapeHtml(booking.customer_name || 'there');

  const itemsList = items.map((item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.equipment_name || '')}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${Number(item.quantity || 0)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.equipment_price || 0).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.subtotal || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const deliverySlotText = formatSlot(booking.delivery_slot);
  const pickupSlotText = formatSlot(booking.pickup_slot);

  const datesTable = isPickup
    ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px 0; color: #6b7280; width: 140px;">Rental Start:</td>
            <td style="padding: 12px 0; color: #111827; font-weight: 500;">${formatDate(booking.start_date)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #6b7280;">Rental End:</td>
            <td style="padding: 12px 0; color: #111827; font-weight: 500;">${formatDate(booking.end_date)}</td>
          </tr>
        </table>`
    : `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px 0; color: #6b7280; width: 140px;">Delivery Date:</td>
            <td style="padding: 12px 0; color: #111827; font-weight: 500;">${formatDate(booking.start_date)}</td>
          </tr>
          ${deliverySlotText ? `<tr>
            <td style="padding: 12px 0; color: #6b7280;">Delivery Time:</td>
            <td style="padding: 12px 0; color: #111827; font-weight: 500;">${deliverySlotText}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 12px 0; color: #6b7280;">Pickup Date:</td>
            <td style="padding: 12px 0; color: #111827; font-weight: 500;">${formatDate(booking.end_date)}</td>
          </tr>
          ${pickupSlotText ? `<tr>
            <td style="padding: 12px 0; color: #6b7280;">Pickup Time:</td>
            <td style="padding: 12px 0; color: #111827; font-weight: 500;">${pickupSlotText}</td>
          </tr>` : ''}
        </table>`;

  const pickupSection = isPickup && booking.pickup_code
    ? `
      <div style="background-color: #ecfdf5; border: 2px solid #10b981; padding: 24px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <p style="margin: 0 0 10px; color: #065f46; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Pickup Code</p>
        <p style="margin: 0 0 16px; color: #047857; font-size: 36px; font-weight: bold; font-family: monospace; letter-spacing: 4px;">${escapeHtml(booking.pickup_code)}</p>
        <p style="margin: 0 0 12px; color: #065f46; font-size: 14px; line-height: 1.6;">
          Please bring this code with you when collecting your equipment at our store.
        </p>
        <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">
          ${escapeHtml(STORE_NAME)}<br>
          ${escapeHtml(STORE_ADDRESS)}
        </p>
      </div>`
    : '';

  const deliveryAddressSection = !isPickup && booking.customer_address
    ? `
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Delivery Address</p>
        <p style="margin: 0; color: #111827; font-size: 16px; line-height: 1.5;">${escapeHtml(booking.customer_address)}</p>
      </div>`
    : '';

  const nextStepFinal = isPickup
    ? 'Collect your equipment at our store &mdash; bring your pickup code'
    : "We'll deliver your equipment on the scheduled date";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Travel Light Aruba</h1>
      <p style="color: #dbeafe; margin: 10px 0 0; font-size: 16px;">Reservation Received</p>
    </div>

    <div style="padding: 40px 30px;">
      <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-weight: bold;">Reservation Successfully Received</p>
        <p style="margin: 8px 0 0; color: #166534; font-size: 14px;">Your reservation is now pending review by our team.</p>
      </div>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Dear ${customerName},</p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Thank you for your equipment rental reservation! We've received your request and our team will review it shortly.
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Booking Reference</p>
        <p style="margin: 0; color: #111827; font-size: 24px; font-weight: bold; font-family: monospace;">${bookingRef}</p>
      </div>

      ${pickupSection}

      <div style="margin: 30px 0;">
        <h2 style="color: #111827; font-size: 20px; margin: 0 0 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Reservation Details</h2>
        ${datesTable}
      </div>

      ${deliveryAddressSection}

      <div style="margin: 30px 0;">
        <h2 style="color: #111827; font-size: 20px; margin: 0 0 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Equipment</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Item</th>
              <th style="padding: 12px 8px; text-align: center; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 12px 8px; text-align: right; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Price/Day</th>
              <th style="padding: 12px 8px; text-align: right; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
            <tr>
              <td colspan="3" style="padding: 16px 8px 8px; text-align: right; font-weight: 600; color: #111827; font-size: 16px;">Estimated Total:</td>
              <td style="padding: 16px 8px 8px; text-align: right; font-weight: 700; color: #2563eb; font-size: 18px;">$${Number(booking.total_amount || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6;">
          <strong>This is not a payment request.</strong> No payment is due right now &mdash; you'll receive a secure payment link by email after we confirm your reservation.
        </p>
      </div>

      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #1e40af; margin: 0 0 15px; font-size: 18px;">What Happens Next?</h3>
        <ol style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 8px;">Our team will review your reservation and confirm within 48 hours</li>
          <li style="margin-bottom: 8px;">You'll receive an email with a secure payment link</li>
          <li style="margin-bottom: 8px;">Complete the payment to confirm your booking</li>
          <li>${nextStepFinal}</li>
        </ol>
      </div>

      <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <h3 style="color: #111827; margin: 0 0 15px; font-size: 16px;">Questions or Need Help?</h3>
        <p style="color: #6b7280; margin: 0; line-height: 1.6;">
          If you have any questions about your reservation, please don't hesitate to contact us:
        </p>
        <p style="color: #374151; margin: 10px 0 0; font-weight: 500;">
          Email: info@travelightaruba.com<br>
          Phone: +297 593-2028<br>
          Hours: Monday - Sunday, 9AM - 6PM
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
        Thank you for choosing Travel Light Aruba!<br>
        We look forward to serving you.
      </p>
    </div>

    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
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
