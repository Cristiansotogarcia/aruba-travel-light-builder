import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Travel Light Aruba <info@travelightaruba.com>';
const REPLY_TO = 'info@travelightaruba.com';

interface DriverDetails {
  email: string;
  name?: string; 
}

interface BookingDetails {
  id: string;
  customer_name: string;
  customer_address: string;
  start_date: string;
  end_date: string;
  // Potentially add booking_items or a summary here if needed for the email
}

interface AssignmentPayload {
  driver: DriverDetails;
  booking: BookingDetails;
}

console.log('Driver assignment email function booting up!');

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json() as AssignmentPayload;
    const { driver, booking } = payload;

    if (!driver || !driver.email || !booking || !booking.id) {
      return new Response(JSON.stringify({ error: 'Missing driver email or booking details' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const driverName = driver.name || 'Driver';
    const subject = `New Delivery Assignment - Booking #${booking.id.substring(0, 8)}`;
    const emailHtml = generateDriverAssignmentEmail({
      driverName,
      booking,
    });

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== DRIVER ASSIGNMENT EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${driver.email}`);
      console.log(`Subject: ${subject}`);

      return new Response(
        JSON.stringify({
          message: 'Email service not configured - email logged to console',
          booking_id: booking.id,
          recipient: driver.email,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
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
        to: [driver.email],
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

    return new Response(JSON.stringify({ message: `Assignment email sent to ${driver.email}`, emailId: emailResult.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing driver assignment email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function generateDriverAssignmentEmail(data: {
  driverName: string;
  booking: BookingDetails;
}): string {
  const bookingRef = data.booking.id.slice(0, 8).toUpperCase();
  const startDateText = new Date(data.booking.start_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const endDateText = new Date(data.booking.end_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Delivery Assignment</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); padding: 36px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">Travel Light Aruba</h1>
      <p style="color: #ccfbf1; margin: 10px 0 0; font-size: 15px;">New Delivery Assignment</p>
    </div>

    <div style="padding: 36px 30px;">
      <div style="background-color: #ecfeff; border-left: 4px solid #14b8a6; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <p style="margin: 0; color: #0f766e; font-weight: bold;">New booking assigned</p>
        <p style="margin: 8px 0 0; color: #0f766e; font-size: 14px;">Please review the details below and confirm in your dashboard.</p>
      </div>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hello ${data.driverName},</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Booking Reference</p>
        <p style="margin: 0; color: #111827; font-size: 22px; font-weight: bold; font-family: monospace;">${bookingRef}</p>
      </div>

      <div style="margin: 24px 0;">
        <h2 style="color: #111827; font-size: 18px; margin: 0 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Assignment Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #6b7280; width: 140px;">Customer:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500;">${data.booking.customer_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280;">Address:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500;">${data.booking.customer_address}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280;">Delivery Date:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500;">${startDateText}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280;">Pickup Date:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500;">${endDateText}</td>
          </tr>
        </table>
      </div>

      <div style="margin: 30px 0; padding: 18px; background-color: #f9fafb; border-radius: 8px;">
        <h3 style="color: #111827; margin: 0 0 10px; font-size: 16px;">Next Step</h3>
        <p style="color: #6b7280; margin: 0; line-height: 1.6;">
          Please check your driver dashboard to view full booking details and confirm the assignment.
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Thank you,<br>
        The Travel Light Aruba Team
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
