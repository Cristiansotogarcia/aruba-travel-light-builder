import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Travel Light Aruba <info@travelightaruba.com>';
const REPLY_TO = 'info@travelightaruba.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_URL = Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('SITE_URL') || '';

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

interface DeliveryTrackingRequest {
  task_id: string;
}

interface DeliveryTrackingSnapshot {
  bookingId: string;
  customerEmail: string;
  customerName: string;
  driverName: string | null;
  etaWindowEnd: string | null;
  etaWindowStart: string | null;
  scheduledFor: string | null;
  status: string;
  taskId: string;
  taskType: string;
  trackingToken: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as DeliveryTrackingRequest;

    if (!requestData.task_id) {
      return new Response(JSON.stringify({ error: 'task_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const snapshot = await resolveTrackingSnapshot(requestData.task_id);
    const subject = buildTrackingSubject(snapshot);
    const emailHtml = generateTrackingEmail(snapshot);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      console.log('=== DELIVERY TRACKING EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${snapshot.customerEmail}`);
      console.log(`Subject: ${subject}`);

      return new Response(
        JSON.stringify({
          message: 'Email service not configured - email logged to console',
          task_id: snapshot.taskId,
          recipient: snapshot.customerEmail,
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
        to: [snapshot.customerEmail],
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

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResult.id,
      recipient: snapshot.customerEmail,
      task_id: snapshot.taskId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error sending delivery tracking email:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function resolveTrackingSnapshot(taskId: string): Promise<DeliveryTrackingSnapshot> {
  if (!supabase) {
    throw new Error('Supabase service role is not configured.');
  }

  const { data: task, error: taskError } = await supabase
    .from('booking_service_tasks')
    .select(`
      id,
      task_type,
      status,
      eta_window_start,
      eta_window_end,
      scheduled_for,
      public_tracking_token,
      assigned_driver_id,
      bookings (
        id,
        customer_email,
        customer_name
      )
    `)
    .eq('id', taskId)
    .single();

  if (taskError || !task?.bookings) {
    throw taskError || new Error('Tracking task not found.');
  }

  let driverName: string | null = null;
  if (task.assigned_driver_id) {
    const { data: driver } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', task.assigned_driver_id)
      .maybeSingle();

    driverName = driver?.name || null;
  }

  return {
    bookingId: task.bookings.id,
    customerEmail: task.bookings.customer_email,
    customerName: task.bookings.customer_name,
    driverName,
    etaWindowEnd: task.eta_window_end,
    etaWindowStart: task.eta_window_start,
    scheduledFor: task.scheduled_for,
    status: task.status,
    taskId: task.id,
    taskType: task.task_type,
    trackingToken: task.public_tracking_token,
  };
}

function buildTrackingSubject(snapshot: DeliveryTrackingSnapshot) {
  const bookingRef = snapshot.bookingId.slice(0, 8).toUpperCase();

  switch (snapshot.status) {
    case 'en_route':
      return `Driver Underway - Booking #${bookingRef}`;
    case 'arrived':
      return `Driver Has Arrived - Booking #${bookingRef}`;
    case 'completed':
      return `Delivery Completed - Booking #${bookingRef}`;
    default:
      return `Delivery Update - Booking #${bookingRef}`;
  }
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatWindow(start: string | null, end: string | null) {
  if (!start || !end) return null;
  return `${new Date(start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${new Date(end).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function getStatusCopy(snapshot: DeliveryTrackingSnapshot) {
  if (snapshot.status === 'arrived') {
    return 'Our driver has arrived at your location.';
  }

  if (snapshot.status === 'en_route') {
    return 'Your delivery is on the way.';
  }

  if (snapshot.status === 'completed') {
    return 'Your delivery has been completed.';
  }

  return 'Your delivery details have been updated.';
}

function generateTrackingEmail(snapshot: DeliveryTrackingSnapshot) {
  const bookingRef = snapshot.bookingId.slice(0, 8).toUpperCase();
  const timeWindow = formatWindow(snapshot.etaWindowStart, snapshot.etaWindowEnd);
  const trackingUrl = APP_URL ? `${APP_URL.replace(/\/$/, '')}/track/${snapshot.trackingToken}` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Tracking Update</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:linear-gradient(135deg,#0f766e 0%,#115e59 100%);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;">Travel Light Aruba</h1>
      <p style="margin:10px 0 0;color:#ccfbf1;font-size:15px;">Delivery Tracking Update</p>
    </div>

    <div style="padding:32px 28px;">
      <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.6;">Hello ${snapshot.customerName},</p>
      <p style="margin:0 0 22px;color:#334155;font-size:16px;line-height:1.6;">${getStatusCopy(snapshot)}</p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Booking Reference</p>
        <p style="margin:0;color:#0f172a;font-size:22px;font-weight:700;font-family:monospace;">${bookingRef}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;color:#64748b;width:180px;">Task</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${snapshot.taskType === 'pickup' ? 'Pickup' : 'Delivery'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Status</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${snapshot.status.replace(/_/g, ' ')}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Scheduled</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${formatDateTime(snapshot.scheduledFor)}</td>
        </tr>
        ${timeWindow ? `<tr>
          <td style="padding:10px 0;color:#64748b;">Expected Between</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${timeWindow}</td>
        </tr>` : ''}
        ${snapshot.driverName ? `<tr>
          <td style="padding:10px 0;color:#64748b;">Driver</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:600;">${snapshot.driverName}</td>
        </tr>` : ''}
      </table>

      ${trackingUrl ? `<div style="margin-top:28px;">
        <a href="${trackingUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">
          Open Tracking Page
        </a>
      </div>` : ''}

      <p style="margin:28px 0 0;color:#64748b;font-size:14px;line-height:1.6;">
        Questions? Reply to this email or contact us at info@travelightaruba.com.
      </p>
    </div>
  </div>
</body>
</html>`;
}
