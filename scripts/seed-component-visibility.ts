import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const supabaseAdmin = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedComponentVisibility() {
  console.log('Starting component visibility seeding...');

  // Define component visibility rules
  const componentVisibilityRules = [
    // ReportingAccess - Analytics/Reports dashboard
    { component_name: 'ReportingAccess', role: 'SuperUser', is_visible: true },
    { component_name: 'ReportingAccess', role: 'Admin', is_visible: true },
    { component_name: 'ReportingAccess', role: 'Booker', is_visible: false },
    { component_name: 'ReportingAccess', role: 'Driver', is_visible: false },

    // BookingManagement
    { component_name: 'BookingManagement', role: 'SuperUser', is_visible: true },
    { component_name: 'BookingManagement', role: 'Admin', is_visible: true },
    { component_name: 'BookingManagement', role: 'Booker', is_visible: true },
    { component_name: 'BookingManagement', role: 'Driver', is_visible: false },

    // BookingAssignment
    { component_name: 'BookingAssignment', role: 'SuperUser', is_visible: true },
    { component_name: 'BookingAssignment', role: 'Admin', is_visible: true },
    { component_name: 'BookingAssignment', role: 'Booker', is_visible: true },
    { component_name: 'BookingAssignment', role: 'Driver', is_visible: false },

    // ProductManagement
    { component_name: 'ProductManagement', role: 'SuperUser', is_visible: true },
    { component_name: 'ProductManagement', role: 'Admin', is_visible: true },
    { component_name: 'ProductManagement', role: 'Booker', is_visible: false },
    { component_name: 'ProductManagement', role: 'Driver', is_visible: false },

    // CategoryManagement
    { component_name: 'CategoryManagement', role: 'SuperUser', is_visible: true },
    { component_name: 'CategoryManagement', role: 'Admin', is_visible: true },
    { component_name: 'CategoryManagement', role: 'Booker', is_visible: false },
    { component_name: 'CategoryManagement', role: 'Driver', is_visible: false },

    // UserManagement
    { component_name: 'UserManagement', role: 'SuperUser', is_visible: true },
    { component_name: 'UserManagement', role: 'Admin', is_visible: true },
    { component_name: 'UserManagement', role: 'Booker', is_visible: false },
    { component_name: 'UserManagement', role: 'Driver', is_visible: false },

    // VisibilitySettings
    { component_name: 'VisibilitySettings', role: 'SuperUser', is_visible: true },
    { component_name: 'VisibilitySettings', role: 'Admin', is_visible: true },
    { component_name: 'VisibilitySettings', role: 'Booker', is_visible: false },
    { component_name: 'VisibilitySettings', role: 'Driver', is_visible: false },

    // DriverTasks
    { component_name: 'DriverTasks', role: 'SuperUser', is_visible: true },
    { component_name: 'DriverTasks', role: 'Admin', is_visible: true },
    { component_name: 'DriverTasks', role: 'Booker', is_visible: false },
    { component_name: 'DriverTasks', role: 'Driver', is_visible: true },

    // TaskMaster
    { component_name: 'TaskMaster', role: 'SuperUser', is_visible: true },
    { component_name: 'TaskMaster', role: 'Admin', is_visible: true },
    { component_name: 'TaskMaster', role: 'Booker', is_visible: false },
    { component_name: 'TaskMaster', role: 'Driver', is_visible: false },

    // Settings
    { component_name: 'settings', role: 'SuperUser', is_visible: true },
    { component_name: 'settings', role: 'Admin', is_visible: true },
    { component_name: 'settings', role: 'Booker', is_visible: false },
    { component_name: 'settings', role: 'Driver', is_visible: false },

    // SEO Manager
    { component_name: 'SeoManager', role: 'SuperUser', is_visible: true },
    { component_name: 'SeoManager', role: 'Admin', is_visible: true },
    { component_name: 'SeoManager', role: 'Booker', is_visible: false },
    { component_name: 'SeoManager', role: 'Driver', is_visible: false },
  ];

  // Insert or update component visibility rules
  for (const rule of componentVisibilityRules) {
    try {
      // Check if the rule already exists
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('component_visibility')
        .select('id')
        .eq('component_name', rule.component_name)
        .eq('role', rule.role)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`Error checking existing rule for ${rule.component_name} - ${rule.role}:`, checkError);
        continue;
      }

      if (existing) {
        // Update existing rule
        const { error: updateError } = await supabaseAdmin
          .from('component_visibility')
          .update({ 
            is_visible: rule.is_visible,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Error updating rule for ${rule.component_name} - ${rule.role}:`, updateError);
        } else {
          console.log(`✓ Updated ${rule.component_name} for ${rule.role}: ${rule.is_visible}`);
        }
      } else {
        // Insert new rule
        const { error: insertError } = await supabaseAdmin
          .from('component_visibility')
          .insert(rule);

        if (insertError) {
          console.error(`Error inserting rule for ${rule.component_name} - ${rule.role}:`, insertError);
        } else {
          console.log(`✓ Created ${rule.component_name} for ${rule.role}: ${rule.is_visible}`);
        }
      }
    } catch (error) {
      console.error(`Unexpected error processing ${rule.component_name} - ${rule.role}:`, error);
    }
  }

  console.log('Component visibility seeding completed!');
}

// Run the seeding function
seedComponentVisibility().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
