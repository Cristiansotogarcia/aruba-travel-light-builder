import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPermissions() {
  console.log('Checking component visibility permissions...');
  
  try {
    const { data, error } = await supabase
      .from('component_visibility')
      .select('*')
      .eq('role', 'Admin')
      .order('component_name');

    if (error) {
      console.error('Error fetching permissions:', error);
      return;
    }

    console.log('\n=== Admin Permissions ===');
    if (data && data.length > 0) {
      data.forEach(permission => {
        console.log(`${permission.component_name}: ${permission.is_visible}`);
      });
    } else {
      console.log('No permissions found for Admin role');
    }

    // Check specifically for SeoManager and ReportingAccess
    const seoManager = data?.find(p => p.component_name === 'SeoManager');
    const reportingAccess = data?.find(p => p.component_name === 'ReportingAccess');

    console.log('\n=== Key Permissions Check ===');
    console.log(`SeoManager: ${seoManager ? seoManager.is_visible : 'NOT FOUND'}`);
    console.log(`ReportingAccess: ${reportingAccess ? reportingAccess.is_visible : 'NOT FOUND'}`);

    // Also check SuperUser permissions
    const { data: superUserData, error: superUserError } = await supabase
      .from('component_visibility')
      .select('*')
      .eq('role', 'SuperUser')
      .order('component_name');

    if (superUserError) {
      console.error('Error fetching SuperUser permissions:', superUserError);
    } else {
      console.log('\n=== SuperUser Permissions ===');
      if (superUserData && superUserData.length > 0) {
        superUserData.forEach(permission => {
          console.log(`${permission.component_name}: ${permission.is_visible}`);
        });
      } else {
        console.log('No permissions found for SuperUser role');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPermissions();
