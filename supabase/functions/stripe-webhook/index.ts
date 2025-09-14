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
    object: any;
  };
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

    // Verify webhook signature (simplified version)
    // In production, you should use the official Stripe library for proper verification
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

async function handleCheckoutSessionCompleted(session: any) {
  const bookingId = session.metadata?.booking_id || session.client_reference_id;
  
  if (!bookingId) {
    console.error('No booking ID found in session metadata');
    return;
  }

  try {
    // Update booking status to confirmed
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'completed',
        stripe_payment_intent_id: session.payment_intent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('Error updating booking:', bookingError);
      return;
    }

    // Update payment record
    const { error: paymentError } = await supabase
      .from('payment_records')
      .update({
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent,
        processed_at: new Date().toISOString(),
        stripe_metadata: {
          ...session,
          processed_at: new Date().toISOString(),
        },
      })
      .eq('stripe_session_id', session.id);

    if (paymentError) {
      console.error('Error updating payment record:', paymentError);
    }

    // Reserve equipment stock
    await reserveEquipmentForBooking(bookingId);

    // Send confirmation email
    await sendBookingConfirmationEmail(bookingId);

    console.log(`Successfully processed payment for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
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
        status: 'completed',
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

async function handlePaymentIntentFailed(paymentIntent: any) {
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

async function handleCheckoutSessionExpired(session: any) {
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