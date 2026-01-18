/// <reference lib="deno.ns" />
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Travel Light Aruba <info@travelightaruba.com>';
const REPLY_TO = 'info@travelightaruba.com';

interface BookingDetails {
  customer_email: string;
  customer_name: string;
  booking_id: string;
  new_status: string;
  old_status?: string;
  start_date?: string;
  equipment_details?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      customer_email,
      customer_name,
      booking_id,
      new_status,
      old_status,
      start_date,
      equipment_details,
    } = await req.json() as BookingDetails;

    if (!customer_email || !customer_name || !booking_id || !new_status) {
      return new Response(
        JSON.stringify({
          error:
            'Missing required booking details: customer_email, customer_name, booking_id, and new_status are required.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const subject = `Booking Update - Booking #${booking_id.slice(0, 8)}`;
    const emailHtml = generateStatusUpdateEmail({
      customer_name,
      booking_id,
      new_status,
      old_status,
      start_date,
      equipment_details,
    });

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== STATUS UPDATE EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${customer_email}`);
      console.log(`Subject: ${subject}`);

      return new Response(
        JSON.stringify({
          message: 'Email service not configured - email logged to console',
          booking_id,
          customer_email,
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
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [customer_email],
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

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        recipient: customer_email,
        booking_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error sending status update email:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function generateStatusUpdateEmail(data: {
  customer_name: string;
  booking_id: string;
  new_status: string;
  old_status?: string;
  start_date?: string;
  equipment_details?: string;
}): string {
  const bookingRef = data.booking_id.slice(0, 8).toUpperCase();
  const statusLabel = formatStatusLabel(data.new_status);
  const previousStatus = data.old_status ? formatStatusLabel(data.old_status) : null;
  const startDateText = data.start_date
    ? new Date(data.start_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const equipmentDetails = data.equipment_details?.trim();

  const previousStatusRow = previousStatus
    ? `<tr>
            <td style="padding: 10px 0; color: #6b7280; width: 140px;">Previous Status:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500;">${previousStatus}</td>
          </tr>`
    : '';

  const startDateRow = startDateText
    ? `<tr>
            <td style="padding: 10px 0; color: #6b7280;">Start Date:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500;">${startDateText}</td>
          </tr>`
    : '';

  const equipmentSection = equipmentDetails
    ? `<div style="margin: 30px 0;">
        <h2 style="color: #111827; font-size: 18px; margin: 0 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Equipment</h2>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">${equipmentDetails}</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Status Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 36px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">Travel Light Aruba</h1>
      <p style="color: #dbeafe; margin: 10px 0 0; font-size: 15px;">Booking Status Update</p>
    </div>

    <div style="padding: 36px 30px;">
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <p style="margin: 0; color: #1e3a8a; font-weight: bold;">Status Updated to ${statusLabel}</p>
        <p style="margin: 8px 0 0; color: #1e3a8a; font-size: 14px;">Your booking status has been updated by our team.</p>
      </div>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Dear ${data.customer_name},</p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        We wanted to let you know that your booking status has changed. Details are below.
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Booking Reference</p>
        <p style="margin: 0; color: #111827; font-size: 22px; font-weight: bold; font-family: monospace;">${bookingRef}</p>
      </div>

      <div style="margin: 24px 0;">
        <h2 style="color: #111827; font-size: 18px; margin: 0 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Update Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #6b7280; width: 140px;">New Status:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 600;">${statusLabel}</td>
          </tr>
          ${previousStatusRow}
          ${startDateRow}
        </table>
      </div>

      ${equipmentSection}

      <div style="margin: 30px 0; padding: 18px; background-color: #f9fafb; border-radius: 8px;">
        <h3 style="color: #111827; margin: 0 0 10px; font-size: 16px;">Need Help?</h3>
        <p style="color: #6b7280; margin: 0; line-height: 1.6;">
          If you have any questions about this update, please contact us:
        </p>
        <p style="color: #374151; margin: 10px 0 0; font-weight: 500;">
          Email: info@travelightaruba.com<br>
          Phone: +297 593-2028<br>
          Hours: Monday - Sunday, 9AM - 6PM
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Thank you for choosing Travel Light Aruba.<br>
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
