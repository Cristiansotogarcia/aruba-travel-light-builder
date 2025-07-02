import { supabase } from '../src/integrations/supabase/client';

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
    data?.forEach(permission => {
      console.log(`${permission.component_name}: ${permission.is_visible}`);
    });

    // Check specifically for SeoManager and ReportingAccess
    const seoManager = data?.find(p => p.component_name === 'SeoManager');
    const reportingAccess = data?.find(p => p.component_name === 'ReportingAccess');

    console.log('\n=== Key Permissions Check ===');
    console.log(`SeoManager: ${seoManager ? seoManager.is_visible : 'NOT FOUND'}`);
    console.log(`ReportingAccess: ${reportingAccess ? reportingAccess.is_visible : 'NOT FOUND'}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPermissions();
