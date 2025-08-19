import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

interface PaymentRequest {
  bookingId: string;
  amount: number;
  successUrl: string;
  cancelUrl: string;
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
    const { bookingId, amount, successUrl, cancelUrl } = await req.json() as PaymentRequest;

    if (!bookingId || !amount || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const sessionId = crypto.randomUUID();
    // In a real implementation you would call your payment provider (e.g., Stripe)
    // to create a checkout session here. We'll return a mock payment URL instead.
    const paymentUrl = `https://example.com/pay/${sessionId}?success=${encodeURIComponent(successUrl)}&cancel=${encodeURIComponent(cancelUrl)}`;

    return new Response(
      JSON.stringify({ paymentUrl, sessionId }),
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

