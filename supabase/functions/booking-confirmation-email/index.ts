import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Resend configuration
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailRequest {
  bookingId: string;
  type?: 'confirmation' | 'status_update' | 'reminder';
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
    const { bookingId, type = 'confirmation' } = await req.json() as EmailRequest;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: 'Missing booking ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!RESEND_API_KEY) {
      console.error('Resend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_items (
          quantity,
          price_at_booking,
          equipment (
            name,
            description,
            category
          )
        ),
        profiles!bookings_assigned_driver_id_fkey (
          full_name,
          email
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    let emailContent;
    let subject;

    switch (type) {
      case 'confirmation':
        emailContent = generateConfirmationEmail(booking);
        subject = `Booking Confirmation - ${booking.id.slice(0, 8)}`;
        break;
      case 'status_update':
        emailContent = generateStatusUpdateEmail(booking);
        subject = `Booking Status Update - ${booking.id.slice(0, 8)}`;
        break;
      case 'reminder':
        emailContent = generateReminderEmail(booking);
        subject = `Booking Reminder - ${booking.id.slice(0, 8)}`;
        break;
      default:
        emailContent = generateConfirmationEmail(booking);
        subject = `Booking Confirmation - ${booking.id.slice(0, 8)}`;
    }

    // Send email via Resend
    const emailResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Aruba Travel Light <bookings@arubatravel.com>',
        to: [booking.customer_email],
        subject: subject,
        html: emailContent,
        text: stripHtml(emailContent),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const emailResult = await emailResponse.json();

    // Log the email in audit trail
    const { error: auditError } = await supabase
      .from('booking_audit_log')
      .insert({
        booking_id: bookingId,
        user_id: '00000000-0000-0000-0000-000000000000', // System user
        action: `EMAIL_SENT_${type.toUpperCase()}`,
        notes: `Email sent to ${booking.customer_email}`,
        metadata: {
          email_id: emailResult.id,
          email_type: type,
          recipient: booking.customer_email,
        },
      });

    if (auditError) {
      console.error('Error logging email audit:', auditError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.id,
        recipient: booking.customer_email 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

function generateConfirmationEmail(booking: any): string {
  const startDate = new Date(booking.start_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const endDate = new Date(booking.end_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const equipmentList = booking.booking_items
    .map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.equipment.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price_at_booking.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.quantity * item.price_at_booking).toFixed(2)}</td>
      </tr>
    `)
    .join('');

  const totalAmount = booking.booking_items
    .reduce((sum: number, item: any) => sum + (item.quantity * item.price_at_booking), 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🏝️ Aruba Travel Light</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Booking Confirmation</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #667eea; margin-top: 0;">Thank you for your booking!</h2>
          
          <p>Dear ${booking.customer_name},</p>
          
          <p>We're excited to confirm your equipment rental booking. Your payment has been successfully processed, and your equipment will be ready for pickup/delivery as scheduled.</p>
          
          <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">📋 Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.id.slice(0, 8)}</p>
            <p><strong>Customer:</strong> ${booking.customer_name}</p>
            <p><strong>Email:</strong> ${booking.customer_email}</p>
            <p><strong>Phone:</strong> ${booking.customer_phone || 'Not provided'}</p>
            <p><strong>Rental Period:</strong> ${startDate} to ${endDate}</p>
            <p><strong>Delivery Address:</strong> ${booking.delivery_address || 'Pickup at store'}</p>
            ${booking.customer_comment ? `<p><strong>Special Instructions:</strong> ${booking.customer_comment}</p>` : ''}
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #667eea;">🎒 Equipment Rental</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background: #667eea; color: white;">
                  <th style="padding: 12px; text-align: left;">Equipment</th>
                  <th style="padding: 12px; text-align: center;">Qty</th>
                  <th style="padding: 12px; text-align: right;">Rate</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${equipmentList}
              </tbody>
              <tfoot>
                <tr style="background: #f0f4ff; font-weight: bold;">
                  <td colspan="3" style="padding: 12px; text-align: right;">Total Amount:</td>
                  <td style="padding: 12px; text-align: right;">$${totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d5a2d;">✅ What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>We'll contact you 24 hours before your rental start date to confirm delivery/pickup details</li>
              <li>Please ensure someone is available at the delivery address during the scheduled time</li>
              <li>Bring a valid ID for equipment pickup</li>
              <li>Our team will provide a brief orientation on equipment usage</li>
            </ul>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">📞 Need Help?</h3>
            <p style="margin: 0;">If you have any questions or need to modify your booking, please contact us:</p>
            <p style="margin: 10px 0 0 0;">
              <strong>Phone:</strong> +297 123-4567<br>
              <strong>Email:</strong> support@arubatravel.com<br>
              <strong>WhatsApp:</strong> +297 123-4567
            </p>
          </div>
          
          <p style="text-align: center; margin-top: 30px; color: #666;">
            Thank you for choosing Aruba Travel Light!<br>
            We look forward to making your Aruba adventure unforgettable! 🌴
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>This is an automated email. Please do not reply directly to this message.</p>
        <p>© 2024 Aruba Travel Light. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

function generateStatusUpdateEmail(booking: any): string {
  const statusColors: Record<string, string> = {
    confirmed: '#28a745',
    processing: '#ffc107',
    delivered: '#17a2b8',
    completed: '#6f42c1',
    cancelled: '#dc3545',
  };

  const statusColor = statusColors[booking.status] || '#6c757d';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Status Update</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🏝️ Aruba Travel Light</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Booking Status Update</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #667eea; margin-top: 0;">Booking Status Update</h2>
          
          <p>Dear ${booking.customer_name},</p>
          
          <p>We wanted to update you on the status of your equipment rental booking.</p>
          
          <div style="background: ${statusColor}; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; font-size: 24px; text-transform: uppercase;">${booking.status}</h3>
            <p style="margin: 10px 0 0 0;">Booking ID: ${booking.id.slice(0, 8)}</p>
          </div>
          
          <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">📋 Booking Summary</h3>
            <p><strong>Rental Period:</strong> ${new Date(booking.start_date).toLocaleDateString()} to ${new Date(booking.end_date).toLocaleDateString()}</p>
            <p><strong>Equipment:</strong> ${booking.booking_items.length} item(s)</p>
            <p><strong>Delivery Address:</strong> ${booking.delivery_address || 'Pickup at store'}</p>
          </div>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d5a2d;">📞 Questions?</h3>
            <p style="margin: 0;">If you have any questions about this update, please don't hesitate to contact us at support@arubatravel.com or +297 123-4567.</p>
          </div>
          
          <p style="text-align: center; margin-top: 30px; color: #666;">
            Thank you for choosing Aruba Travel Light! 🌴
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>This is an automated email. Please do not reply directly to this message.</p>
        <p>© 2024 Aruba Travel Light. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

function generateReminderEmail(booking: any): string {
  const startDate = new Date(booking.start_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Reminder</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🏝️ Aruba Travel Light</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Booking Reminder</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #667eea; margin-top: 0;">Your rental starts tomorrow!</h2>
          
          <p>Dear ${booking.customer_name},</p>
          
          <p>This is a friendly reminder that your equipment rental is scheduled to begin tomorrow, ${startDate}.</p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">⏰ Reminder Details</h3>
            <p><strong>Booking ID:</strong> ${booking.id.slice(0, 8)}</p>
            <p><strong>Start Date:</strong> ${startDate}</p>
            <p><strong>Delivery/Pickup:</strong> ${booking.delivery_address || 'Store pickup required'}</p>
            <p><strong>Equipment:</strong> ${booking.booking_items.length} item(s) reserved</p>
          </div>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d5a2d;">✅ Please Remember</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Have a valid ID ready for equipment pickup</li>
              <li>Be available at the delivery address during scheduled time</li>
              <li>Our team will contact you to confirm exact timing</li>
              <li>Ask any questions during the equipment orientation</li>
            </ul>
          </div>
          
          <p style="text-align: center; margin-top: 30px; color: #666;">
            We're excited to help make your Aruba adventure amazing! 🌴
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>This is an automated email. Please do not reply directly to this message.</p>
        <p>© 2024 Aruba Travel Light. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}