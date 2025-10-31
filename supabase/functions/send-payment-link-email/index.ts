import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';

interface PaymentLinkEmailRequest {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  payment_link: string;
  total_amount: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData: PaymentLinkEmailRequest = await req.json();
    
    const {
      booking_id,
      customer_name,
      customer_email,
      payment_link,
      total_amount
    } = requestData;

    // Validate required fields
    if (!customer_email || !customer_name || !booking_id || !payment_link) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate email content
    const emailHtml = generatePaymentLinkEmail({
      booking_id,
      customer_name,
      payment_link,
      total_amount
    });

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      
      // Log email for debugging
      console.log('=== PAYMENT LINK EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${customer_email}`);
      console.log(`Subject: Payment Link for Booking #${booking_id.slice(0, 8)}`);
      
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
        from: 'Aruba Travel Light <reservations@arubatravel.com>',
        to: [customer_email],
        subject: `Payment Link Ready - Booking #${booking_id.slice(0, 8)}`,
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
    console.error('Error sending payment link email:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generatePaymentLinkEmail(data: {
  booking_id: string;
  customer_name: string;
  payment_link: string;
  total_amount: number;
}): string {
  const bookingRef = data.booking_id.slice(0, 8).toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Link Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Aruba Travel Light</h1>
      <p style="color: #d1fae5; margin: 10px 0 0; font-size: 16px;">Your Reservation is Confirmed!</p>
    </div>

    <div style="padding: 40px 30px;">
      <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
        <p style="margin: 0; color: #065f46; font-weight: bold;">✓ Reservation Approved</p>
        <p style="margin: 8px 0 0; color: #065f46; font-size: 14px;">Your equipment rental has been confirmed by our team!</p>
      </div>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Dear ${data.customer_name},</p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Great news! We've reviewed your reservation and are ready to proceed. Please complete your payment to finalize your booking.
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Booking Reference</p>
        <p style="margin: 0; color: #111827; font-size: 24px; font-weight: bold; font-family: monospace;">${bookingRef}</p>
      </div>

      <div style="background-color: #eff6ff; border: 2px solid #3b82f6; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <p style="margin: 0 0 10px; color: #1e40af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Total Amount Due</p>
        <p style="margin: 0 0 20px; color: #1e3a8a; font-size: 36px; font-weight: bold;">$${data.total_amount.toFixed(2)}</p>
        
        <a href="${data.payment_link}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-top: 10px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
          Complete Payment →
        </a>
        
        <p style="margin: 20px 0 0; color: #6b7280; font-size: 12px;">
          Secure payment processing
        </p>
      </div>

      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #92400e; margin: 0 0 10px; font-size: 16px;">⏰ Payment Deadline</h3>
        <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">
          Please complete your payment within <strong>48 hours</strong> to keep your reservation. After this time, your booking may be released.
        </p>
      </div>

      <div style="margin: 30px 0;">
        <h3 style="color: #111827; margin: 0 0 15px; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">What Happens Next?</h3>
        <ol style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 10px;">Click the "Complete Payment" button above</li>
          <li style="margin-bottom: 10px;">Follow the secure payment process</li>
          <li style="margin-bottom: 10px;">Receive booking confirmation and delivery details</li>
          <li>Your equipment will be delivered on the scheduled date</li>
        </ol>
      </div>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #111827; margin: 0 0 10px; font-size: 16px;">📋 Payment Link</h3>
        <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px;">
          If the button above doesn't work, copy and paste this link into your browser:
        </p>
        <p style="margin: 0; padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; color: #3b82f6;">
          ${data.payment_link}
        </p>
      </div>

      <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <h3 style="color: #111827; margin: 0 0 15px; font-size: 16px;">Need Help?</h3>
        <p style="color: #6b7280; margin: 0; line-height: 1.6;">
          If you have any questions or issues with the payment, please contact us:
        </p>
        <p style="color: #374151; margin: 10px 0 0; font-weight: 500;">
          📧 Email: support@arubatravel.com<br>
          📞 Phone: +297 123 4567<br>
          🕐 Hours: Monday - Sunday, 9AM - 6PM
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
        Thank you for choosing Aruba Travel Light!<br>
        We're excited to serve you.
      </p>
    </div>

    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This is an automated email. Please do not reply directly to this message.
      </p>
      <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Aruba Travel Light. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
}
