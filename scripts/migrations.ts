import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigrations() {
  // Create tables
  const tables = ['customers', 'equipment', 'bookings'];
  
  for (const table of tables) {
    const { data: exists } = await supabaseAdmin
      .rpc('table_exists', { name: table });

    if (!exists) {
      switch (table) {
        case 'customers':
          await supabaseAdmin.rpc('create_table_if_not_exists', {
            table_name: 'customers',
            columns: `
              id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
              created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
              user_id uuid NOT NULL,
              full_name text NOT NULL,
              email text NOT NULL,
              phone text
            `
          });
          break;

        case 'equipment':
          await supabaseAdmin.rpc('create_table_if_not_exists', {
            table_name: 'equipment',
            columns: `
              id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id uuid NOT NULL,
              name text NOT NULL,
              type text NOT NULL,
              daily_rate numeric NOT NULL,
              available boolean DEFAULT true,
              created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
            `
          });
          break;

        case 'bookings':
          await supabaseAdmin.rpc('create_table_if_not_exists', {
            table_name: 'bookings',
            columns: `
              id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
              customer_id uuid REFERENCES customers(id) NOT NULL,
              equipment_id uuid REFERENCES equipment(id) NOT NULL,
              start_date date NOT NULL,
              end_date date NOT NULL,
              status text NOT NULL,
              created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
            `
          });
          break;
      }
    }
  }

  // Enable RLS and create policies
  await supabaseAdmin.rpc('enable_row_level_security', { table_name: 'customers' });
  await supabaseAdmin.rpc('create_policy', {
    table_name: 'customers',
    policy_name: 'user_access',
    command: 'ALL',
    using: 'user_id = auth.uid()',
    check: 'user_id = auth.uid()'
  });

  await supabaseAdmin.rpc('enable_row_level_security', { table_name: 'equipment' });
  await supabaseAdmin.rpc('create_policy', {
    table_name: 'equipment',
    policy_name: 'owner_access',
    command: 'ALL',
    using: 'user_id = auth.uid()',
    check: 'user_id = auth.uid()'
  });

  await supabaseAdmin.rpc('enable_row_level_security', { table_name: 'bookings' });
  await supabaseAdmin.rpc('create_policy', {
    table_name: 'bookings',
    policy_name: 'customer_access',
    command: 'SELECT',
    using: 'customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())'
  });

  // Create indexes
  await supabaseAdmin.rpc('create_index_if_not_exists', {
    table_name: 'customers',
    index_name: 'customers_user_id_idx',
    columns: 'user_id'
  });

  console.log('Migrations completed successfully');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});