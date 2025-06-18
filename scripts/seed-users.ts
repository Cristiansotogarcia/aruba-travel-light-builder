import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface UserData {
  email: string;
  name: string;
  role: 'SuperUser' | 'Admin' | 'Booker' | 'Driver';
}

const users: UserData[] = [
  { email: 'meldrick@example.com', name: 'Meldrick', role: 'SuperUser' },
  { email: 'roxanne@example.com', name: 'Roxanne', role: 'SuperUser' },
  { email: 'angelique.bagheri@example.com', name: 'Angelique Bagheri', role: 'SuperUser' },
  { email: 'cristian.soto@example.com', name: 'Cristian Soto Garcia', role: 'Admin' },
  { email: 'xerxes.croes.booking@example.com', name: 'Xerxes Croes (Booking)', role: 'Booker' },
  { email: 'xerxes.croes.driver@example.com', name: 'Xerxes Croes (Driver)', role: 'Driver' },
  { email: 'kenya.donata@example.com', name: 'Kenya Donata', role: 'Booker' },
  { email: 'lyrick.pourier@example.com', name: 'Lyrick Pourier', role: 'Driver' },
  { email: 'steven.daza@example.com', name: 'Steven Daza', role: 'Driver' },
  { email: 'vania.dirksz@example.com', name: 'Vania Dirksz', role: 'Driver' },
  { email: 'jocey.dirksz@example.com', name: 'Jocey Dirksz', role: 'Driver' },
];

interface ComponentVisibility {
  component_name: string;
  roles: {
    SuperUser: boolean;
    Admin: boolean;
    Booker: boolean;
    Driver: boolean;
  };
}

const componentVisibilitySettings: ComponentVisibility[] = [
  {
    component_name: 'dashboard',
    roles: { SuperUser: true, Admin: true, Booker: true, Driver: true }
  },
  {
    component_name: 'bookings',
    roles: { SuperUser: true, Admin: true, Booker: true, Driver: false }
  },
  {
    component_name: 'customers',
    roles: { SuperUser: true, Admin: true, Booker: true, Driver: false }
  },
  {
    component_name: 'assignment',
    roles: { SuperUser: true, Admin: true, Booker: false, Driver: false }
  },
  {
    component_name: 'equipment',
    roles: { SuperUser: true, Admin: true, Booker: false, Driver: false }
  },
  {
    component_name: 'users',
    roles: { SuperUser: true, Admin: true, Booker: false, Driver: false }
  },
  {
    component_name: 'visibility',
    roles: { SuperUser: true, Admin: false, Booker: false, Driver: false }
  },
  {
    component_name: 'tasks',
    roles: { SuperUser: true, Admin: true, Booker: false, Driver: true }
  },
  {
    component_name: 'settings',
    roles: { SuperUser: true, Admin: true, Booker: false, Driver: false }
  },
  {
    component_name: 'TaskMaster',
    roles: { SuperUser: true, Admin: true, Booker: false, Driver: false }
  },
];

async function seedUsers() {
  console.log('Starting user seeding process...');

  for (const userData of users) {
    try {
      // Generate a temporary password
      const tempPassword = `${randomUUID().substring(0, 8)}!Aa1`;
      
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('name', userData.name)
        .maybeSingle();

      if (existingUsers) {
        console.log(`User ${userData.name} already exists, skipping...`);
        continue;
      }

      // Create the user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: tempPassword,
        email_confirm: true,
      });

      if (createError) {
        console.error(`Error creating user ${userData.name}:`, createError.message);
        continue;
      }

      if (!newUser.user) {
        console.error(`Failed to create user ${userData.name}: No user returned`);
        continue;
      }

      // Update the user's profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          name: userData.name,
          role: userData.role,
          needs_password_change: true,
        })
        .eq('id', newUser.user.id);

      if (profileError) {
        console.error(`Error updating profile for ${userData.name}:`, profileError.message);
        continue;
      }

      // Create a temporary password entry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { error: tempPasswordError } = await supabaseAdmin
        .from('user_temp_passwords')
        .insert({
          user_id: newUser.user.id,
          temp_password: tempPassword,
          expires_at: expiresAt.toISOString(),
        });

      if (tempPasswordError) {
        console.error(`Error creating temp password for ${userData.name}:`, tempPasswordError.message);
        continue;
      }

      console.log(`Created user ${userData.name} with role ${userData.role} and temporary password`);
    } catch (error) {
      console.error(`Unexpected error creating user ${userData.name}:`, error);
    }
  }

  console.log('User seeding completed.');
}

async function seedComponentVisibility() {
  console.log('Starting component visibility seeding process...');

  // First, clear existing component visibility settings
  const { error: deleteError } = await supabaseAdmin
    .from('component_visibility')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // This will delete all rows

  if (deleteError) {
    console.error('Error clearing component visibility settings:', deleteError.message);
    return;
  }

  // Insert new component visibility settings
  for (const component of componentVisibilitySettings) {
    for (const [role, isVisible] of Object.entries(component.roles)) {
      const { error } = await supabaseAdmin
        .from('component_visibility')
        .insert({
          component_name: component.component_name,
          role: role as 'SuperUser' | 'Admin' | 'Booker' | 'Driver',
          is_visible: isVisible,
        });

      if (error) {
        console.error(`Error setting visibility for ${component.component_name} and role ${role}:`, error.message);
      }
    }
  }

  console.log('Component visibility seeding completed.');
}

async function main() {
  try {
    await seedUsers();
    await seedComponentVisibility();
    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

main();