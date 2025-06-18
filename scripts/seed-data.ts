import { createClient } from '@supabase/supabase-js';
// import { Customer, Equipment, Booking } from '../src/lib/queries/types';

const supabaseAdmin = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedSampleData() {
  // Sample customers
  const { data: customers, error: custError } = await supabaseAdmin
    .from('customers')
    .insert([
      { full_name: 'John Doe', email: 'john@example.com', phone: '+5991234567' },
      { full_name: 'Jane Smith', email: 'jane@example.com' }
    ])
    .select();

  if (custError) throw custError;

  // Sample equipment
  const { data: equipment, error: eqError } = await supabaseAdmin
    .from('equipment')
    .insert([
      { name: 'Ocean Kayak', type: 'kayak', daily_rate: 25, available: true },
      { name: 'Pro Snorkel Set', type: 'snorkel', daily_rate: 15, available: true }
    ])
    .select();

  if (eqError) throw eqError;

  // Sample bookings
  const { data: bookings, error: bookError } = await supabaseAdmin
    .from('bookings')
    .insert([
      {
        customer_id: customers[0].id,
        equipment_id: equipment[0].id,
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        status: 'confirmed'
      }
    ])
    .select();

  if (bookError) throw bookError;

  console.log('Successfully seeded:', { customers, equipment, bookings });
}

seedSampleData().catch(console.error);