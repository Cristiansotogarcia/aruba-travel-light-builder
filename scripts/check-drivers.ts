// Script to check drivers in the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkDrivers() {
  console.log('🔍 Checking drivers in database...\n');

  // Get all profiles
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email, role')
    .order('role', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    process.exit(1);
  }

  console.log('📋 All profiles:');
  profiles?.forEach(p => {
    console.log(`   - ${p.name} (${p.email}) - Role: ${p.role}`);
  });

  console.log('\n🚗 Drivers only:');
  const drivers = profiles?.filter(p => p.role === 'Driver');
  if (drivers && drivers.length > 0) {
    drivers.forEach(d => {
      console.log(`   - ${d.name} (${d.email}) - ID: ${d.id}`);
    });
  } else {
    console.log('   No drivers found!');
  }
}

checkDrivers().catch(console.error);