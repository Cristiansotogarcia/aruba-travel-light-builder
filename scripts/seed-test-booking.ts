// Script to seed a test booking for testing driver dashboard and signature
// Run with: npx tsx scripts/seed-test-booking.ts

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function seedTestBooking() {
  console.log('🧪 Seeding test booking for driver dashboard testing...\n');

  // 1. Get or create a test customer profile
  console.log('📋 Step 1: Getting/creating test customer...');
  
  // Find a driver user to use as the customer user
  const { data: driverProfiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, name')
    .eq('role', 'Driver')
    .limit(1);

  if (profileError || !driverProfiles || driverProfiles.length === 0) {
    console.error('Error: No driver profiles found. Please run seed-users.ts first.');
    process.exit(1);
  }

  const userId = driverProfiles[0].id;
  console.log(`   Using user ID: ${userId}`);

  // 2. Get available equipment
  console.log('\n📋 Step 2: Getting available equipment...');
  
  const { data: equipment, error: eqError } = await supabaseAdmin
    .from('equipment')
    .select('id, name, price_per_day')
    .eq('availability', true)
    .limit(2);

  if (eqError || !equipment || equipment.length === 0) {
    console.error('Error: No equipment found. Please run seed-equipment.ts first.');
    process.exit(1);
  }

  console.log(`   Found ${equipment.length} equipment items`);
  equipment.forEach((eq, i) => console.log(`   ${i + 1}. ${eq.name} - $${eq.price_per_day}/day`));

  // 3. Create a test booking
  console.log('\n📋 Step 3: Creating test booking...');
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Tomorrow
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 3); // 3 days later

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert({
      user_id: userId,
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '+59991234567',
      customer_address: 'Palm Beach, Aruba',
      room_number: '123',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      total_amount: equipment.reduce((sum, eq) => sum + eq.price_per_day * 3, 0),
      status: 'confirmed',
      payment_status: 'paid',
      delivery_slot: 'morning',
    })
    .select()
    .single();

  if (bookingError) {
    console.error('Error creating booking:', bookingError);
    process.exit(1);
  }

  console.log(`   Created booking ID: ${booking.id}`);
  console.log(`   Status: ${booking.status}`);
  console.log(`   Dates: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

  // 4. Create booking items
  console.log('\n📋 Step 4: Creating booking items...');
  
  const bookingItems = equipment.map(eq => ({
    booking_id: booking.id,
    equipment_id: eq.id,
    equipment_name: eq.name,
    equipment_price: eq.price_per_day,
    quantity: 1,
    subtotal: eq.price_per_day * 3,
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('booking_items')
    .insert(bookingItems);

  if (itemsError) {
    console.error('Error creating booking items:', itemsError);
    process.exit(1);
  }

  console.log(`   Created ${bookingItems.length} booking items`);

  // 5. Fetch the service tasks created by the trigger
  console.log('\n📋 Step 5: Fetching service tasks (created by system)...');
  
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('booking_service_tasks')
    .select('id, task_type, status, public_tracking_token, scheduled_for')
    .eq('booking_id', booking.id);

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
    process.exit(1);
  }

  const deliveryTaskInfo = tasks?.find(t => t.task_type === 'delivery');
  const pickupTaskInfo = tasks?.find(t => t.task_type === 'pickup');

  console.log(`   Found ${tasks?.length || 0} service tasks`);
  if (deliveryTaskInfo) {
    console.log(`   - Delivery: ${deliveryTaskInfo.id} (${deliveryTaskInfo.status})`);
    console.log(`     Tracking: ${deliveryTaskInfo.public_tracking_token}`);
    console.log(`     Scheduled: ${deliveryTaskInfo.scheduled_for}`);
  }
  if (pickupTaskInfo) {
    console.log(`   - Pickup: ${pickupTaskInfo.id} (${pickupTaskInfo.status})`);
  }

  // 6. Update the delivery task with a tracking token and scheduled dates
  const deliveryDate = new Date(startDate);
  deliveryDate.setHours(9, 0, 0, 0);

  const pickupDate = new Date(endDate);
  pickupDate.setHours(17, 0, 0, 0);

  if (deliveryTaskInfo) {
    const trackingToken = `track_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const { error: updateError } = await supabaseAdmin
      .from('booking_service_tasks')
      .update({
        status: 'scheduled',
        scheduled_for: deliveryDate.toISOString(),
        eta_window_start: deliveryDate.toISOString(),
        eta_window_end: new Date(deliveryDate.getTime() + 60 * 60 * 1000).toISOString(),
        public_tracking_token: trackingToken,
      })
      .eq('id', deliveryTaskInfo.id);

    if (updateError) {
      console.error('Error updating delivery task:', updateError);
    } else {
      console.log(`   ✅ Updated delivery task with tracking token`);
    }
  }

  if (pickupTaskInfo) {
    const { error: updateError } = await supabaseAdmin
      .from('booking_service_tasks')
      .update({
        status: 'scheduled',
        scheduled_for: pickupDate.toISOString(),
      })
      .eq('id', pickupTaskInfo.id);

    if (updateError) {
      console.error('Error updating pickup task:', updateError);
    } else {
      console.log(`   ✅ Updated pickup task`);
    }
  }

  // 7. Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test booking seeded successfully!');
  console.log('\n📝 Test Booking Details:');
  console.log(`   Booking ID: ${booking.id}`);
  console.log(`   Customer: ${booking.customer_name}`);
  console.log(`   Email: ${booking.customer_email}`);
  console.log(`   Delivery Date: ${deliveryDate.toLocaleDateString()}`);
  console.log(`   Pickup Date: ${pickupDate.toLocaleDateString()}`);
  // Fetch the final tracking token
  const { data: finalTasks } = await supabaseAdmin
    .from('booking_service_tasks')
    .select('public_tracking_token')
    .eq('booking_id', booking.id)
    .eq('task_type', 'delivery')
    .single();

  const finalTrackingToken = finalTasks?.public_tracking_token || 'N/A';

  console.log('\n🔧 To test:');
  console.log('   1. Go to Admin Dashboard -> Bookings');
  console.log('   2. Find this booking and assign a driver');
  console.log('   3. Login as driver and check driver dashboard');
  console.log('   4. Test the signature functionality');
  console.log('\n💡 You can also test the public tracking page at:');
  console.log(`   http://localhost:5173/track/${finalTrackingToken}`);
}

seedTestBooking().catch(console.error);