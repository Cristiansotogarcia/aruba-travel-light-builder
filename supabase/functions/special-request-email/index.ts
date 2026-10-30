import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Staff notification for a Special Request submitted at /contact
// (public.special_requests, migration 20261029200000_special_requests.sql).
// Invoked fire-and-forget from the client with { id } only. The row is
// re-read server-side with the service role and the email is rendered from
// the stored row, so the caller cannot influence the content or reply-to,
// and every email is backed by a persisted, RLS- and CHECK-validated record.
// Same model as send-booking-confirmation.
//
// One row sends at most one email: the row is claimed by setting
// notified_at with a conditional update (notified_at IS NULL), and the claim
// is released again only if nothing was sent.
//
// Secrets: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (already configured for sibling functions), optional STAFF_NOTIFICATION_EMAIL.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// Overridable so tests can point the send at a local fake.
const RESEND_API_URL = Deno.env.get('RESEND_API_URL') || 'https://api.resend.com/emails';
const FROM_EMAIL = 'Travel Light Aruba <info@travelightaruba.com>';
// Staff mailbox that triages special requests. Override with
// STAFF_NOTIFICATION_EMAIL if a dedicated inbox is set up later.
const STAFF_EMAIL = Deno.env.get('STAFF_NOTIFICATION_EMAIL') || 'info@travelightaruba.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SpecialRequestType = 'general' | 'last_minute' | 'special_arrangement';

interface SpecialRequestRow {
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

  // Never leak internals to the caller: generic failure body only.
  const genericFailure = (status: number) =>
    new Response(JSON.stringify({ error: 'Could not send special request email' }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  let id: unknown;
  try {
    id = ((await req.json()) as { id?: unknown })?.id;
  } catch {
    return genericFailure(400);
  }

  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    return genericFailure(400);
  }

  if (!supabase) {
    console.error('special-request-email: Supabase service role is not configured');
    return genericFailure(500);
  }

  // Claim the row: only a stored request that has not been notified yet.
  const { data: claimed, error: claimError } = await supabase
    .from('special_requests')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('notified_at', null)
    .select('id, name, email, phone, request_type, message, preferred_dates, created_at');

  if (claimError) {
    console.error('special-request-email: claim failed', id, claimError.message);
    return genericFailure(500);
  }

  const specialRequest = (claimed as SpecialRequestRow[] | null)?.[0];
  if (!specialRequest) {
    // Unknown id, or this request was already notified. Same answer for both.
    return genericFailure(404);
  }

  const releaseClaim = async () => {
    const { error } = await supabase
      .from('special_requests')
      .update({ notified_at: null })
      .eq('id', specialRequest.id);
    if (error) {
      console.error('special-request-email: failed to release claim', specialRequest.id, error.message);
    }
  };

  try {
    const typeLabel = REQUEST_TYPE_LABELS[specialRequest.request_type] ?? specialRequest.request_type;
    const subject = `New Special Request (${typeLabel}) - ${specialRequest.name}`;
    const emailHtml = generateStaffNotificationEmail(specialRequest, typeLabel);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== SPECIAL REQUEST EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${STAFF_EMAIL}`);
      console.log(`Subject: ${subject}`);
      // Nothing was sent, so the row stays eligible for a real send later.
      await releaseClaim();

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
      console.error('Resend API error:', await emailResponse.text());
      await releaseClaim();
      return genericFailure(502);
    }

    // Resend accepted the send, so the claim stays from here on: releasing it
    // because the response body could not be read would let a retry email
    // staff a second time.
    let emailId: string | undefined;
    try {
      emailId = ((await emailResponse.json()) as { id?: string }).id;
    } catch {
      console.error('special-request-email: sent, but the Resend response was not JSON', specialRequest.id);
    }

    return new Response(
      JSON.stringify({ message: `Special request email sent to ${STAFF_EMAIL}`, emailId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error processing special request email:', error);
    await releaseClaim();
    return genericFailure(500);
  }
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateStaffNotificationEmail(data: SpecialRequestRow, typeLabel: string): string {
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
