// Quick smoke test for delivery infrastructure
// Run: npx tsx scripts/smoke-test.ts
// Requires: VITE_SUPABASE_ANON_KEY environment variable

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://abofxrgdxfzrhjbvhdkj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: VITE_SUPABASE_ANON_KEY environment variable is required');
  console.error('Run: export VITE_SUPABASE_ANON_KEY=your_key && npx tsx scripts/smoke-test.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('🔍 Testing delivery infrastructure...\n');
  
  // Test 1: Service Tasks
  console.log('1. Checking booking_service_tasks table...');
  const { data: tasks, error: tErr } = await supabase
    .from('booking_service_tasks')
    .select('id, task_type, status, public_tracking_token')
    .limit(3);
  console.log(`   Found: ${tasks?.length || 0} tasks`, tErr ? `Error: ${tErr.message}` : '');
  
  // Test 2: Delivery Slips
  console.log('\n2. Checking delivery_slips table...');
  const { data: slips, error: sErr } = await supabase
    .from('delivery_slips')
    .select('id, slip_number, customer_name')
    .limit(3);
  console.log(`   Found: ${slips?.length || 0} slips`, sErr ? `Error: ${sErr.message}` : '');
  
  // Test 3: Storage bucket
  console.log('\n3. Checking delivery-proofs bucket...');
  const { data: buckets } = await supabase.storage.listBuckets();
  const hasBucket = buckets?.some(b => b.name === 'delivery-proofs');
  console.log(`   Bucket exists: ${hasBucket ? '✅' : '❌'}`);
  
  // Test 4: RPC function
  console.log('\n4. Testing get_public_tracking_details RPC...');
  const token = tasks?.find(t => t.public_tracking_token)?.public_tracking_token;
  if (token) {
    const { data: tracking, error: trErr } = await supabase.rpc('get_public_tracking_details', {
      p_tracking_token: token
    });
    console.log(`   RPC works: ${trErr ? '❌' : '✅'}`, trErr ? trErr.message : '');
    if (tracking) {
      console.log(`   Status: ${tracking.task_status}, Customer: ${tracking.booking?.customer_name}`);
    }
  } else {
    console.log('   No tracking tokens found - skipping');
  }

  console.log('\n✅ Smoke test complete!');
}

test().catch(console.error);