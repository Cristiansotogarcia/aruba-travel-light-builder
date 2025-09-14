import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PaymentRequest {
  bookingId: string;
  amount: number;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
}

interface StripeCheckoutSession {
  id: string;
  url: string;
  payment_intent?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Stripe configuration
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_API_URL = 'https://api.stripe.com/v1';

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
    const { bookingId, amount, successUrl, cancelUrl, customerEmail, customerName } = await req.json() as PaymentRequest;

    if (!bookingId || !amount || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!STRIPE_SECRET_KEY) {
      console.error('Stripe secret key not configured');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get booking details from database
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_items (
          quantity,
          price_at_booking,
          equipment (
            name,
            description
          )
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Create line items for Stripe
    const lineItems = booking.booking_items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.equipment.name,
          description: item.equipment.description,
        },
        unit_amount: Math.round(item.price_at_booking * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Create Stripe checkout session
    const stripeResponse = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': `${successUrl}?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
        'cancel_url': `${cancelUrl}?booking_id=${bookingId}`,
        'client_reference_id': bookingId,
        'customer_email': customerEmail || booking.customer_email,
        'metadata[booking_id]': bookingId,
        'metadata[customer_name]': customerName || booking.customer_name,
        'payment_intent_data[metadata][booking_id]': bookingId,
        ...lineItems.reduce((acc, item, index) => {
          acc[`line_items[${index}][price_data][currency]`] = item.price_data.currency;
          acc[`line_items[${index}][price_data][product_data][name]`] = item.price_data.product_data.name;
          acc[`line_items[${index}][price_data][product_data][description]`] = item.price_data.product_data.description;
          acc[`line_items[${index}][price_data][unit_amount]`] = item.price_data.unit_amount.toString();
          acc[`line_items[${index}][quantity]`] = item.quantity.toString();
          return acc;
        }, {} as Record<string, string>),
      }),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment session' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const session: StripeCheckoutSession = await stripeResponse.json();

    // Update booking with Stripe session ID and payment status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        stripe_session_id: session.id,
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      // Continue anyway as the Stripe session was created successfully
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payment_records')
      .insert({
        booking_id: bookingId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent,
        amount: amount,
        currency: 'USD',
        status: 'pending',
        stripe_metadata: {
          session_id: session.id,
          booking_id: bookingId,
        },
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      // Continue anyway as the Stripe session was created successfully
    }

    return new Response(
      JSON.stringify({ 
        paymentUrl: session.url, 
        sessionId: session.id,
        bookingId: bookingId 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error creating payment session:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

