import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Stripe configuration
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: StripeWebhookObject;
  };
}

interface StripeMetadata {
  booking_id?: string;
  [key: string]: string | undefined;
}

interface StripeSession {
  id: string;
  client_reference_id?: string | null;
  payment_intent?: string | null;
  metadata?: StripeMetadata;
  [key: string]: unknown;
}

interface StripePaymentIntent {
  id: string;
  metadata?: StripeMetadata;
  [key: string]: unknown;
}

type StripeWebhookObject = StripeSession | StripePaymentIntent;

// --- Stripe webhook signature verification (dependency-free, Web Crypto) ---
// Implements the scheme documented at
// https://stripe.com/docs/webhooks/signatures so we do not have to pull the
// full Stripe SDK into the edge runtime.
const sigEncoder = new TextEncoder();

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    sigEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, sigEncoder.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  let timestamp = '';
  const v1Signatures: string[] = [];
  for (const part of sigHeader.split(',')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx);
    const value = part.slice(idx + 1);
    if (key === 't') timestamp = value;
    else if (key === 'v1') v1Signatures.push(value);
  }

  if (!timestamp || v1Signatures.length === 0) return false;

  // Reject replays / forged timestamps outside the tolerance window.
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > toleranceSeconds) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return v1Signatures.some((sig) => timingSafeEqual(sig, expected));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      console.error('Missing webhook signature or secret');
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify the webhook signature with the endpoint's signing secret.
    // This is the ONLY authentication for this endpoint (it is invoked
    // machine-to-machine by Stripe), so a failure must reject the request.
    const signatureValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
    if (!signatureValid) {
      console.error('Stripe webhook signature verification failed');
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const event: StripeEvent = JSON.parse(body);

    console.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function handleCheckoutSessionCompleted(session: StripeSession) {
  const bookingId = session.metadata?.booking_id || session.client_reference_id;
  
  if (!bookingId) {
    console.error('No booking ID found in session metadata');
    return;
  }

  try {
    const processedAt = new Date().toISOString();

    // Update booking status to confirmed
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        stripe_payment_intent_id: session.payment_intent,
        updated_at: processedAt,
      })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('Error updating booking:', bookingError);
      return;
    }

    const paymentRecordId = await ensureSuccessfulPaymentRecord(bookingId, session, processedAt);

    if (!paymentRecordId) {
      console.error(`Unable to resolve a payment record for booking ${bookingId}`);
    }

    // Reserve equipment stock
    await reserveEquipmentForBooking(bookingId);

    // Send confirmation email
    await sendBookingConfirmationEmail(bookingId);

    const invoiceId = await issueInvoiceForBooking(bookingId, paymentRecordId);
    if (invoiceId) {
      await sendInvoiceEmail(invoiceId);
    }

    console.log(`Successfully processed payment for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: StripePaymentIntent) {
  const bookingId = paymentIntent.metadata?.booking_id;
  
  if (!bookingId) {
    console.error('No booking ID found in payment intent metadata');
    return;
  }

  try {
    // Update payment record with final payment intent details
    const { error: paymentError } = await supabase
      .from('payment_records')
      .update({
        status: 'paid',
        processed_at: new Date().toISOString(),
        stripe_metadata: {
          ...paymentIntent,
          processed_at: new Date().toISOString(),
        },
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (paymentError) {
      console.error('Error updating payment record:', paymentError);
    }

    console.log(`Payment intent succeeded for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: StripePaymentIntent) {
  const bookingId = paymentIntent.metadata?.booking_id;
  
  if (!bookingId) {
    console.error('No booking ID found in payment intent metadata');
    return;
  }

  try {
    // Update booking status to cancelled
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('Error updating booking:', bookingError);
    }

    // Update payment record
    const { error: paymentError } = await supabase
      .from('payment_records')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
        stripe_metadata: {
          ...paymentIntent,
          processed_at: new Date().toISOString(),
        },
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (paymentError) {
      console.error('Error updating payment record:', paymentError);
    }

    console.log(`Payment failed for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

async function handleCheckoutSessionExpired(session: StripeSession) {
  const bookingId = session.metadata?.booking_id || session.client_reference_id;
  
  if (!bookingId) {
    console.error('No booking ID found in session metadata');
    return;
  }

  try {
    // Update booking status to cancelled due to expired session
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('payment_status', 'pending'); // Only update if still pending

    if (bookingError) {
      console.error('Error updating booking:', bookingError);
    }

    // Update payment record
    const { error: paymentError } = await supabase
      .from('payment_records')
      .update({
        status: 'expired',
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id);

    if (paymentError) {
      console.error('Error updating payment record:', paymentError);
    }

    console.log(`Checkout session expired for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling checkout session expired:', error);
  }
}

async function ensureSuccessfulPaymentRecord(
  bookingId: string,
  session: StripeSession,
  processedAt: string,
) {
  const metadata = {
    ...session,
    processed_at: processedAt,
  };

  const { data: updatedPayment, error: updateError } = await supabase
    .from('payment_records')
    .update({
      status: 'paid',
      stripe_payment_intent_id: session.payment_intent,
      processed_at: processedAt,
      stripe_metadata: metadata,
    })
    .eq('stripe_session_id', session.id)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error('Error updating payment record:', updateError);
  }

  if (updatedPayment?.id) {
    return updatedPayment.id;
  }

  const { data: booking, error: bookingLookupError } = await supabase
    .from('bookings')
    .select('total_amount')
    .eq('id', bookingId)
    .single();

  if (bookingLookupError || !booking) {
    console.error('Error fetching booking total for fallback payment record:', bookingLookupError);
    return null;
  }

  const { data: insertedPayment, error: insertError } = await supabase
    .from('payment_records')
    .insert({
      booking_id: bookingId,
      amount: booking.total_amount,
      gross_amount: booking.total_amount,
      currency_code: 'AWG',
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      status: 'paid',
      processed_at: processedAt,
      settlement_date: processedAt.split('T')[0],
      stripe_metadata: metadata,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error inserting fallback payment record:', insertError);
    return null;
  }

  return insertedPayment.id;
}

async function issueInvoiceForBooking(bookingId: string, paymentRecordId: string | null) {
  if (!paymentRecordId) {
    return null;
  }

  const { data, error } = await supabase.rpc('issue_booking_invoice', {
    p_booking_id: bookingId,
    p_payment_record_id: paymentRecordId,
  });

  if (error) {
    console.error('Error issuing invoice snapshot:', error);
    return null;
  }

  return data;
}

async function sendInvoiceEmail(invoiceId: string) {
  try {
    const { error } = await supabase.functions.invoke('send-invoice-email', {
      body: { invoice_id: invoiceId },
    });

    if (error) {
      console.error('Error sending invoice email:', error);
    }
  } catch (error) {
    console.error('Error invoking invoice email function:', error);
  }
}

async function reserveEquipmentForBooking(bookingId: string) {
  try {
    // Get booking items
    const { data: bookingItems, error } = await supabase
      .from('booking_items')
      .select('equipment_id, quantity')
      .eq('booking_id', bookingId);

    if (error || !bookingItems) {
      console.error('Error fetching booking items:', error);
      return;
    }

    // Reserve stock for each item
    for (const item of bookingItems) {
      const { error: reserveError } = await supabase
        .rpc('reserve_equipment_stock', {
          p_equipment_id: item.equipment_id,
          p_quantity: item.quantity,
          p_booking_id: bookingId,
        });

      if (reserveError) {
        console.error('Error reserving equipment stock:', reserveError);
      }
    }
  } catch (error) {
    console.error('Error in reserveEquipmentForBooking:', error);
  }
}

async function sendBookingConfirmationEmail(bookingId: string) {
  try {
    // Call the booking confirmation email function
    const { error } = await supabase.functions.invoke('booking-confirmation-email', {
      body: { bookingId },
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
    }
  } catch (error) {
    console.error('Error in sendBookingConfirmationEmail:', error);
  }
}
