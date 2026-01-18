import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';

interface ReservationEmailRequest {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  start_date: string;
  end_date: string;
  delivery_slot: 'morning' | 'afternoon';
  total_amount: number;
  items: Array<{
    equipment_name: string;
    quantity: number;
    equipment_price: number;
    subtotal: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData: ReservationEmailRequest = await req.json();
    
    const {
      booking_id,
      customer_name,
      customer_email,
      start_date,
      end_date,
      delivery_slot,
      total_amount,
      items
    } = requestData;

    // Validate required fields
    if (!customer_email || !customer_name || !booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate email content
    const emailHtml = generateReservationEmail({
      booking_id,
      customer_name,
      start_date,
      end_date,
      delivery_slot,
      total_amount,
      items
    });

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      
      // Log email for debugging
      console.log('=== RESERVATION EMAIL (NOT SENT - NO API KEY) ===');
      console.log(`To: ${customer_email}`);
      console.log(`Subject: Reservation Received - ${booking_id.slice(0, 8)}`);
      
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
        subject: `Reservation Received - Booking #${booking_id.slice(0, 8)}`,
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
    console.error('Error sending reservation email:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateReservationEmail(data: {
  booking_id: string;
  customer_name: string;
  start_date: string;
  end_date: string;
  delivery_slot: string;
  total_amount: number;
  items: Array<{
    equipment_name: string;
    quantity: number;
    equipment_price: number;
    subtotal: number;
  }>;
}): string {
  const bookingRef = data.booking_id.slice(0, 8).toUpperCase();
  const deliveryTime = data.delivery_slot === 'morning' ? 'Morning (9AM - 12PM)' : 'Afternoon (1PM - 5PM)';
  
  const itemsList = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.equipment_name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.equipment_price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Travel Light Aruba</h1>
      <p style="color: #dbeafe; margin: 10px 0 0; font-size: 16px;">Reservation Received</p>
    </div>

    <div style="padding: 40px 30px;">
      <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-weight: bold;">Reservation Successfully Received</p>
        <p style="margin: 8px 0 0; color: #166534; font-size: 14px;">Your reservation is now being reviewed by our team.</p>
      </div>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Dear ${data.customer_name},</p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Thank you for your equipment rental reservation! We've received your request and our team will review it shortly.
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Booking Reference</p>
        <p style="margin: 0; color: #111827; font-size: 24px; font-weight: bold; font-family: monospace;">${bookingRef}</p>
      </div>

      <div style="margin: 30px 0;">
        <h2 style="color: #111827; font-size: 20px; margin: 0 0 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Reservation Details</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px 0; color: #6b7280; width: 140px;">Delivery Date:</td>
            <td style="padding: 12px 0; color: #111827; font-weight: 500;">${new Date(data.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #6b7280;">Delivery Time:</td>
            <td style="padding: 12px 0; color: #111827; font-weight: 500;">${deliveryTime}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #6b7280;">Pickup Date:</td>
            <td style="padding: 12px 0; color: #111827; font-weight: 500;">${new Date(data.end_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
        </table>
      </div>

      <div style="margin: 30px 0;">
        <h2 style="color: #111827; font-size: 20px; margin: 0 0 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Equipment</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Item</th>
              <th style="padding: 12px 8px; text-align: center; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 12px 8px; text-align: right; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Price/Day</th>
              <th style="padding: 12px 8px; text-align: right; color: #6b7280; font-weight: 600; font-size: 14px; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
            <tr>
              <td colspan="3" style="padding: 16px 8px 8px; text-align: right; font-weight: 600; color: #111827; font-size: 16px;">Estimated Total:</td>
              <td style="padding: 16px 8px 8px; text-align: right; font-weight: 700; color: #2563eb; font-size: 18px;">$${data.total_amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #1e40af; margin: 0 0 15px; font-size: 18px;">What Happens Next?</h3>
        <ol style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 8px;">Our team will review your reservation (usually within 24 hours)</li>
          <li style="margin-bottom: 8px;">You'll receive an email with a secure payment link</li>
          <li style="margin-bottom: 8px;">Complete the payment to confirm your booking</li>
          <li>We'll deliver your equipment on the scheduled date</li>
        </ol>
      </div>

      <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <h3 style="color: #111827; margin: 0 0 15px; font-size: 16px;">Questions or Need Help?</h3>
        <p style="color: #6b7280; margin: 0; line-height: 1.6;">
          If you have any questions about your reservation, please don't hesitate to contact us:
        </p>
        <p style="color: #374151; margin: 10px 0 0; font-weight: 500;">
          Email: info@travelightaruba.com<br>
          Phone: +297 593-2028<br>
          Hours: Monday - Sunday, 9AM - 6PM
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
        Thank you for choosing Travel Light Aruba!<br>
        We look forward to serving you.
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


