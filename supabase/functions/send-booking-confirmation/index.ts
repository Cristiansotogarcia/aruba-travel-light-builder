/// <reference lib="deno.ns" />
// supabase/functions/send-booking-confirmation/index.ts
//
// Sends a "Reservation received" confirmation email to the customer after a
// booking is created. Invoked fire-and-forget from the client with
// { booking_id }. All booking data is loaded server-side using the service
// role key so the caller cannot influence the email content.
//
// Secrets (already configured in the Supabase project — this function does not
// add any):
//   - RESEND_API_KEY            Resend API key
//   - SUPABASE_URL              (injected automatically)
//   - SUPABASE_SERVICE_ROLE_KEY (injected automatically)
//   - BOOKING_EMAIL_FROM        (optional) override the From address
//
// This function is deploy-ready but is NOT deployed here (the orchestrator
// deploys at integration time).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

// Default From address. Uses the verified sending domain travellightaruba.com.
// Overridable via the BOOKING_EMAIL_FROM secret without redeploying code.
const DEFAULT_FROM = 'Travel Light Aruba <reservations@travellightaruba.com>';

// Store / pickup location details (from the store location card).
const STORE_NAME = 'Travel Light Aruba';
const STORE_ADDRESS_LINE1 = 'Caya Taratata 15, Unit 11';
const STORE_ADDRESS_LINE2 = 'Coral Plaza, Aruba';

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
}

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
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(value: number): string {
  const n = typeof value === 'number' && !isNaN(value) ? value : 0;
  return `$${n.toFixed(2)}`;
}

// This branch of the app has no fulfillment_method / pickup_code columns on the
// bookings table (no migrations allowed). Pickup vs delivery is therefore
// derived from whether a delivery address is present: delivery bookings capture
// an address; pickup bookings leave it blank.
function isPickup(address: string | null): boolean {
  return !address || address.trim().length === 0;
}

function buildItemsHtml(items: BookingItemRow[]): string {
  const rows = items
    .map((item) => {
      const name = escapeHtml(item.equipment_name ?? '');
      const qty = Number(item.quantity ?? 0);
      const subtotal = formatMoney(Number(item.subtotal ?? 0));
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eaeaea;">${name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eaeaea;text-align:center;">${qty}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eaeaea;text-align:right;">${subtotal}</td>
        </tr>`;
    })
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
      <thead>
        <tr>
          <th style="padding:8px 12px;border-bottom:2px solid #333;text-align:left;">Item</th>
          <th style="padding:8px 12px;border-bottom:2px solid #333;text-align:center;">Qty</th>
          <th style="padding:8px 12px;border-bottom:2px solid #333;text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildEmailHtml(booking: BookingRow, items: BookingItemRow[]): string {
  const name = escapeHtml(booking.customer_name ?? 'there');
  const pickup = isPickup(booking.customer_address);
  const shortId = escapeHtml(String(booking.id).substring(0, 8).toUpperCase());

  const pickupSection = pickup
    ? `
      <div style="margin:24px 0;padding:16px 20px;background:#f4f9f4;border:1px solid #cfe6cf;border-radius:8px;">
        <p style="margin:0 0 8px;font-weight:bold;font-size:15px;">Your pickup code</p>
        <p style="margin:0 0 12px;font-size:28px;font-weight:bold;letter-spacing:3px;color:#1a7f37;">${shortId}</p>
        <p style="margin:0 0 4px;">Please bring this code with you when you collect your equipment.</p>
        <p style="margin:12px 0 4px;font-weight:bold;">Pickup location</p>
        <p style="margin:0;">${escapeHtml(STORE_NAME)}<br/>${escapeHtml(STORE_ADDRESS_LINE1)}<br/>${escapeHtml(STORE_ADDRESS_LINE2)}</p>
      </div>`
    : `
      <div style="margin:24px 0;padding:16px 20px;background:#f5f7fb;border:1px solid #d5deee;border-radius:8px;">
        <p style="margin:0 0 8px;font-weight:bold;font-size:15px;">Delivery</p>
        <p style="margin:0;">We'll deliver your equipment to:<br/>${escapeHtml(booking.customer_address ?? '')}</p>
      </div>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px;line-height:1.5;">
    <h1 style="font-size:22px;margin:0 0 8px;">Reservation received</h1>
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">Thank you for your reservation with ${escapeHtml(STORE_NAME)}. We've received your request and it is now <strong>pending review</strong>. Here are the details:</p>

    <table style="font-size:14px;margin:0 0 8px;">
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Reservation</td><td style="padding:2px 0;">#${shortId}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#666;">Rental dates</td><td style="padding:2px 0;">${formatDate(booking.start_date)} &ndash; ${formatDate(booking.end_date)}</td></tr>
    </table>

    ${buildItemsHtml(items)}

    <p style="text-align:right;font-size:16px;margin:4px 0 0;"><strong>Total: ${formatMoney(Number(booking.total_amount ?? 0))}</strong></p>

    ${pickupSection}

    <div style="margin:24px 0;padding:16px 20px;background:#fff8ef;border:1px solid #f0dcc0;border-radius:8px;font-size:14px;">
      <p style="margin:0 0 8px;font-weight:bold;">What happens next</p>
      <p style="margin:0 0 8px;">Your reservation is <strong>pending review</strong>. Our team will confirm availability within <strong>48 hours</strong>.</p>
      <p style="margin:0 0 8px;"><strong>This is not a payment request.</strong> No payment is due now &mdash; a secure payment link will follow once your reservation is confirmed.</p>
    </div>

    <p style="margin:16px 0 4px;">If you have any questions, just reply to this email.</p>
    <p style="margin:0;">Warm regards,<br/>The ${escapeHtml(STORE_NAME)} Team</p>
  </div>`;
}

function buildEmailText(booking: BookingRow, items: BookingItemRow[]): string {
  const pickup = isPickup(booking.customer_address);
  const shortId = String(booking.id).substring(0, 8).toUpperCase();

  const lines: string[] = [];
  lines.push(`Hi ${booking.customer_name ?? 'there'},`);
  lines.push('');
  lines.push(
    `Thank you for your reservation with ${STORE_NAME}. We've received your request and it is now pending review.`,
  );
  lines.push('');
  lines.push(`Reservation: #${shortId}`);
  lines.push(`Rental dates: ${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`);
  lines.push('');
  lines.push('Items:');
  for (const item of items) {
    lines.push(
      `  - ${item.equipment_name} x${item.quantity} — ${formatMoney(Number(item.subtotal ?? 0))}`,
    );
  }
  lines.push('');
  lines.push(`Total: ${formatMoney(Number(booking.total_amount ?? 0))}`);
  lines.push('');
  if (pickup) {
    lines.push(`Your pickup code: ${shortId}`);
    lines.push('Please bring this code with you when you collect your equipment.');
    lines.push('');
    lines.push('Pickup location:');
    lines.push(`  ${STORE_NAME}`);
    lines.push(`  ${STORE_ADDRESS_LINE1}`);
    lines.push(`  ${STORE_ADDRESS_LINE2}`);
  } else {
    lines.push('Delivery to:');
    lines.push(`  ${booking.customer_address ?? ''}`);
  }
  lines.push('');
  lines.push('What happens next:');
  lines.push('Your reservation is pending review. Our team will confirm availability within 48 hours.');
  lines.push('This is not a payment request. No payment is due now — a secure payment link will follow once your reservation is confirmed.');
  lines.push('');
  lines.push('If you have any questions, just reply to this email.');
  lines.push('');
  lines.push(`Warm regards,`);
  lines.push(`The ${STORE_NAME} Team`);

  return lines.join('\n');
}

Deno.serve(async (req: Request) => {
  // CORS preflight (client invokes this from the browser via supabase-js).
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Generic failure response — never leak internal error details to the caller.
  const genericFailure = (status: number) =>
    new Response(
      JSON.stringify({ success: false, error: 'Could not send confirmation email' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  try {
    let body: { booking_id?: string };
    try {
      body = await req.json();
    } catch {
      return genericFailure(400);
    }

    const bookingId = body?.booking_id;
    if (!bookingId || typeof bookingId !== 'string') {
      return genericFailure(400);
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
      console.error('send-booking-confirmation: missing required environment secrets');
      return genericFailure(500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load the booking (service role — bypasses RLS).
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_name, customer_email, customer_address, start_date, end_date, total_amount, status')
      .eq('id', bookingId)
      .single<BookingRow>();

    if (bookingError || !booking) {
      console.error('send-booking-confirmation: booking not found', bookingId, bookingError?.message);
      // Booking does not exist / not found — treat as a bad request but stay generic.
      return genericFailure(404);
    }

    if (!booking.customer_email) {
      console.error('send-booking-confirmation: booking has no customer_email', bookingId);
      return genericFailure(422);
    }

    // Load line items (best-effort — an email with an empty item list is still useful).
    const { data: itemsData, error: itemsError } = await supabase
      .from('booking_items')
      .select('equipment_name, quantity, equipment_price, subtotal')
      .eq('booking_id', bookingId);

    if (itemsError) {
      console.error('send-booking-confirmation: failed to load items', bookingId, itemsError.message);
    }
    const items: BookingItemRow[] = (itemsData as BookingItemRow[] | null) ?? [];

    const from = Deno.env.get('BOOKING_EMAIL_FROM') || DEFAULT_FROM;
    const subject = `Reservation received — #${String(booking.id).substring(0, 8).toUpperCase()}`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: booking.customer_email,
        subject,
        html: buildEmailHtml(booking, items),
        text: buildEmailText(booking, items),
      }),
    });

    if (!emailResponse.ok) {
      const detail = await emailResponse.text();
      console.error('send-booking-confirmation: Resend error', emailResponse.status, detail);
      return genericFailure(502);
    }

    const result = await emailResponse.json().catch(() => ({}));
    console.log('send-booking-confirmation: email sent', bookingId, (result as { id?: string })?.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-booking-confirmation: unexpected error', error);
    return genericFailure(500);
  }
});
