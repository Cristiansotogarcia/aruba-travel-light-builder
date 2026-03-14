import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';

interface RejectionEmailRequest {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  rejection_reason: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData: RejectionEmailRequest = await req.json();
    
    const {
      booking_id,
      customer_name,
      customer_email,
      rejection_reason
    } = requestData;

    // Validate required fields
    if (!customer_email || !customer_name || !booking_id || !rejection_reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate email content
    const emailHtml = generateRejectionEmail({
      booking_id,
      customer_name,
      rejection_reason
    });

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      
      // Log email for debugging
      console.log('=== REJECTION EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${customer_email}`);
      console.log(`Subject: Reservation Update - Booking #${booking_id.slice(0, 8)}`);
      
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
        from: 'Travel Light Aruba <info@travelightaruba.com>',
        to: [customer_email],
        reply_to: 'info@travelightaruba.com',
        subject: `Reservation Update - Booking #${booking_id.slice(0, 8)}`,
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
    console.error('Error sending rejection email:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateRejectionEmail(data: {
  booking_id: string;
  customer_name: string;
  rejection_reason: string;
}): string {
  const bookingRef = data.booking_id.slice(0, 8).toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Travel Light Aruba</h1>
      <p style="color: #d1d5db; margin: 10px 0 0; font-size: 16px;">Reservation Update</p>
    </div>

    <div style="padding: 40px 30px;">
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-weight: bold;">Reservation Not Approved</p>
        <p style="margin: 8px 0 0; color: #991b1b; font-size: 14px;">Unfortunately, we're unable to process your reservation at this time.</p>
      </div>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Dear ${data.customer_name},</p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Thank you for your interest in Travel Light Aruba. We appreciate you taking the time to submit a reservation request.
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
        After reviewing your reservation, we regret to inform you that we're unable to fulfill it at this time.
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Booking Reference</p>
        <p style="margin: 0; color: #111827; font-size: 24px; font-weight: bold; font-family: monospace;">${bookingRef}</p>
      </div>

      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #92400e; margin: 0 0 15px; font-size: 16px;">Reason for Decline:</h3>
        <p style="color: #78350f; margin: 0; font-size: 15px; line-height: 1.6;">
          ${data.rejection_reason}
        </p>
      </div>

      <div style="background-color: #eff6ff; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #1e40af; margin: 0 0 15px; font-size: 16px;">What You Can Do:</h3>
        <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 8px;">Contact us to discuss alternative options or dates</li>
          <li style="margin-bottom: 8px;">Check our website for equipment availability</li>
          <li style="margin-bottom: 8px;">Submit a new reservation request with modified details</li>
          <li>Reach out to our team for personalized assistance</li>
        </ul>
      </div>

      <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <h3 style="color: #111827; margin: 0 0 15px; font-size: 16px;">Contact Our Team</h3>
        <p style="color: #6b7280; margin: 0 0 15px; line-height: 1.6;">
          We're here to help find a solution that works for you. Please don't hesitate to reach out:
        </p>
        <p style="color: #374151; margin: 0; font-weight: 500;">
          Email: info@travelightaruba.com<br>
          Phone: +297 593-2028<br>
          Hours: Monday - Sunday, 9AM - 6PM
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://travelightaruba.com" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Visit Our Website
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
        We apologize for any inconvenience and hope to serve you in the future.<br><br>
        Best regards,<br>
        <strong style="color: #374151;">The Travel Light Aruba Team</strong>
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

