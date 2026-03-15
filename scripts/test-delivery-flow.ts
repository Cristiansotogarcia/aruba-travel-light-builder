// Smoke test for delivery flow
// Run with: npx tsx scripts/test-delivery-flow.ts

import { createClient } from '@supabase/supabase-js';

// Use environment variables - NEVER hardcode keys
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://abofxrgdxfzrhjbvhdkj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: VITE_SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

interface TestResult {
  step: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

const results: TestResult[] = [];

async function runSmokeTest() {
  console.log('🧪 Starting Delivery Flow Smoke Test\n');
  console.log('='.repeat(50));

  try {
    // Step 1: Check if we can query bookings (requires auth)
    console.log('\n📋 Step 1: Checking booking access...');
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, customer_name, start_date, end_date')
      .in('status', ['confirmed', 'pending_admin_review'])
      .limit(3);

    if (bookingsError) {
      console.log('⚠️  Cannot query bookings - requires authentication');
      console.log('   Error:', bookingsError.message);
      console.log('\n   This is expected if not logged in.');
      console.log('   Testing public tracking instead...\n');
      
      results.push({ step: 'Booking access', success: false, error: bookingsError.message });
    } else {
      console.log('✅ Found', bookings.length, 'active bookings');
      results.push({ step: 'Booking access', success: true, data: bookings });
    }

    // Step 2: Test service tasks table access
    console.log('📋 Step 2: Checking service tasks table...');
    
    const { data: tasks, error: tasksError } = await supabase
      .from('booking_service_tasks')
      .select('id, task_type, status, scheduled_for, public_tracking_token')
      .limit(5);

    if (tasksError) {
      console.log('⚠️  Cannot query service tasks');
      console.log('   Error:', tasksError.message);
      results.push({ step: 'Service tasks access', success: false, error: tasksError.message });
    } else {
      console.log('✅ Found', tasks?.length || 0, 'service tasks');
      results.push({ step: 'Service tasks access', success: true, data: tasks });

      // Check if tasks have tracking tokens
      const tasksWithTokens = tasks?.filter(t => t.public_tracking_token) || [];
      if (tasksWithTokens.length > 0) {
        console.log('   📌 Found', tasksWithTokens.length, 'tasks with tracking tokens');
      }
    }

    // Step 3: Test delivery slips table
    console.log('📋 Step 3: Checking delivery slips table...');
    
    const { data: slips, error: slipsError } = await supabase
      .from('delivery_slips')
      .select('id, slip_number, customer_name, delivered_at')
      .order('delivered_at', { ascending: false })
      .limit(5);

    if (slipsError) {
      console.log('⚠️  Cannot query delivery slips');
      console.log('   Error:', slipsError.message);
      results.push({ step: 'Delivery slips access', success: false, error: slipsError.message });
    } else {
      console.log('✅ Found', slips?.length || 0, 'delivery slips');
      results.push({ step: 'Delivery slips access', success: true, data: slips });
    }

    // Step 4: Test public tracking RPC
    console.log('📋 Step 4: Testing public tracking RPC...');
    
    // Try to get a valid tracking token from tasks
    const validToken = tasks?.find(t => t.public_tracking_token)?.public_tracking_token;
    
    if (validToken) {
      const { data: trackingData, error: trackingError } = await supabase.rpc(
        'get_public_tracking_details',
        { p_tracking_token: validToken }
      );

      if (trackingError) {
        console.log('⚠️  RPC call failed');
        console.log('   Error:', trackingError.message);
        results.push({ step: 'Tracking RPC', success: false, error: trackingError.message });
      } else {
        console.log('✅ Public tracking RPC works');
        console.log('   Task status:', trackingData?.task_status);
        console.log('   Customer:', trackingData?.booking?.customer_name);
        results.push({ step: 'Tracking RPC', success: true, data: trackingData });
      }
    } else {
      console.log('⚠️  No tracking tokens available to test');
      results.push({ step: 'Tracking RPC', success: false, error: 'No tokens available' });
    }

    // Step 5: Check storage bucket
    console.log('📋 Step 5: Checking delivery-proofs storage bucket...');
    
    // Try to upload a test file to verify bucket is accessible (requires service role)
    if (!supabaseAdmin) {
      console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - skipping bucket test');
      results.push({ step: 'Storage bucket access', success: false, error: 'Service role key not configured' });
    } else {
      const testContent = 'smoke-test-' + Date.now();
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('delivery-proofs')
        .upload('.smoke-test/' + testContent, testContent, { upsert: true });

      if (uploadError) {
        console.log('⚠️  Cannot access delivery-proofs bucket');
        results.push({ step: 'Storage bucket access', success: false, error: uploadError.message });
      } else {
        console.log('✅ delivery-proofs bucket exists and is writable');
        // Clean up test file
        await supabaseAdmin.storage.from('delivery-proofs').remove([uploadData.path]);
        results.push({ step: 'Storage bucket access', success: true });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SMOKE TEST RESULTS\n');
    
    let passed = 0;
    let failed = 0;
    
    results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      console.log(`${status} ${r.step}`);
      if (r.error) console.log(`   Error: ${r.error}`);
      if (r.success) passed++;
      else failed++;
    });

    console.log('\n' + '-'.repeat(30));
    console.log(`Total: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. This may be expected if:');
      console.log('   - No user is authenticated');
      console.log('   - No bookings exist yet');
      console.log('   - No delivery tasks have been created');
    } else {
      console.log('\n🎉 All tests passed!');
    }

  } catch (error) {
    console.error('\n❌ Smoke test crashed:', error);
  }
}

// Export for direct execution
runSmokeTest().catch(console.error);