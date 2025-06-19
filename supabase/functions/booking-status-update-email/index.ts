/// <reference lib="deno.ns" />
// supabase/functions/booking-status-update-email/index.ts
// import { serve } from 'jsr:@std/http/server'; // Removed this line
import { corsHeaders } from '../_shared/cors.ts';

console.log('Booking Status Update Email function up and running!');

interface BookingDetails {
  customer_email: string;
  customer_name: string;
  booking_id: string;
  new_status: string;
  old_status?: string; // Optional, for more detailed emails
  // Add any other relevant details needed for the email template
  start_date?: string;
  equipment_details?: string; 
}

// Replaced `serve` with `Deno.serve`
Deno.serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
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
      equipment_details 
    } = await req.json() as BookingDetails;

    if (!customer_email || !customer_name || !booking_id || !new_status) {
      return new Response(JSON.stringify({ error: 'Missing required booking details: customer_email, customer_name, booking_id, and new_status are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const subject = `Booking ${booking_id} Status Updated to ${new_status}`;
    let body = `Dear ${customer_name},\n\n`;
    body += `The status of your booking (ID: ${booking_id}) has been updated to: ${new_status}.\n`;
    if (old_status) {
      body += `Previous status was: ${old_status}.\n`;
    }
    if (start_date) {
      body += `Booking date: ${new Date(start_date).toLocaleDateString()}\n`;
    }
    if (equipment_details) {
      body += `Equipment: ${equipment_details}\n`;
    }
    body += `\nThank you for choosing Aruba Travel Light!\n`;
    body += `\nBest regards,\nThe Aruba Travel Light Team`;

    console.log(`Attempting to send email to: ${customer_email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);

    // Placeholder for actual email sending logic
    // In a real scenario, you would integrate with an email service provider like SendGrid, Resend, etc.
    // Example (conceptual, requires actual implementation and API keys):
    /*
    const emailApiKey = Deno.env.get('EMAIL_PROVIDER_API_KEY');
    if (!emailApiKey) {
      console.error('Email provider API key not configured.');
      return new Response(JSON.stringify({ error: 'Email service not configured on server.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const response = await fetch('https://api.emailprovider.com/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: customer_email,
        from: 'noreply@yourdomain.com', // Configure your sending email address
        subject: subject,
        text: body,
        // html: '<h1>HTML version of the email</h1>' // Optional HTML version
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Failed to send email:', response.status, errorBody);
      return new Response(JSON.stringify({ error: 'Failed to send email notification.' , details: errorBody }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }
    console.log('Email sent successfully (simulated).');
    */

    // For now, we'll just log and return success as if the email was sent.
    console.log('Email sending logic placeholder: Email would be sent here.');

    return new Response(JSON.stringify({ message: 'Email notification processed (simulated).', subject, bodyPreview: body.substring(0, 100) + '...' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});