import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Staff notification for a Special Request submitted at /contact
// (public.special_requests, migration 20261029200000_special_requests.sql).
// Mirrors supabase/functions/driver-assignment-email: the caller already has
// the full row (just inserted it), so this function only renders and sends —
// it never queries the database itself, and it holds no service-role key.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Travel Light Aruba <info@travelightaruba.com>';
// Staff mailbox that triages special requests. Override with
// STAFF_NOTIFICATION_EMAIL if a dedicated inbox is set up later.
const STAFF_EMAIL = Deno.env.get('STAFF_NOTIFICATION_EMAIL') || 'info@travelightaruba.com';

type SpecialRequestType = 'general' | 'last_minute' | 'special_arrangement';

interface SpecialRequestPayload {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  request_type: SpecialRequestType;
  message: string;
  preferred_dates: string | null;
  created_at: string;
}

const REQUEST_TYPE_LABELS: Record<SpecialRequestType, string> = {
  general: 'General inquiry',
  last_minute: 'Last-minute rental',
  special_arrangement: 'Special arrangement',
};

console.log('Special request email function booting up!');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as { special_request?: SpecialRequestPayload };
    const specialRequest = payload.special_request;

    if (!specialRequest || !specialRequest.id || !specialRequest.email) {
      return new Response(JSON.stringify({ error: 'Missing special_request details' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const typeLabel = REQUEST_TYPE_LABELS[specialRequest.request_type] ?? specialRequest.request_type;
    const subject = `New Special Request (${typeLabel}) - ${specialRequest.name}`;
    const emailHtml = generateStaffNotificationEmail(specialRequest, typeLabel);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== SPECIAL REQUEST EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${STAFF_EMAIL}`);
      console.log(`Subject: ${subject}`);

      return new Response(
        JSON.stringify({
          message: 'Email service not configured - email logged to console',
          special_request_id: specialRequest.id,
          recipient: STAFF_EMAIL,
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
        to: [STAFF_EMAIL],
        reply_to: specialRequest.email,
        subject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailResult = await emailResponse.json();

    return new Response(
      JSON.stringify({ message: `Special request email sent to ${STAFF_EMAIL}`, emailId: emailResult.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error processing special request email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateStaffNotificationEmail(data: SpecialRequestPayload, typeLabel: string): string {
  const submittedAt = new Date(data.created_at).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Special Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); padding: 36px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">Travel Light Aruba</h1>
      <p style="color: #ccfbf1; margin: 10px 0 0; font-size: 15px;">New Special Request</p>
    </div>

    <div style="padding: 36px 30px;">
      <div style="background-color: #ecfeff; border-left: 4px solid #14b8a6; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <p style="margin: 0; color: #0f766e; font-weight: bold;">${escapeHtml(typeLabel)}</p>
        <p style="margin: 8px 0 0; color: #0f766e; font-size: 14px;">Submitted ${escapeHtml(submittedAt)}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; width: 140px;">Name:</td>
          <td style="padding: 10px 0; color: #111827; font-weight: 500;">${escapeHtml(data.name)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280;">Email:</td>
          <td style="padding: 10px 0; color: #111827; font-weight: 500;">${escapeHtml(data.email)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280;">Phone:</td>
          <td style="padding: 10px 0; color: #111827; font-weight: 500;">${data.phone ? escapeHtml(data.phone) : 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280;">Preferred dates:</td>
          <td style="padding: 10px 0; color: #111827; font-weight: 500;">${data.preferred_dates ? escapeHtml(data.preferred_dates) : 'Not provided'}</td>
        </tr>
      </table>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
        <p style="margin: 0; color: #111827; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Reply directly to this email to respond to ${escapeHtml(data.name)}.
      </p>
    </div>

    <div style="background-color: #f3f4f6; padding: 18px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Special request #${escapeHtml(data.id.slice(0, 8))} &middot; Travel Light Aruba
      </p>
    </div>
  </div>
</body>
</html>`;
}
