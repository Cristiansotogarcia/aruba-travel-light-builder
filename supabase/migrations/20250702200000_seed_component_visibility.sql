-- Seed component visibility permissions for all roles
-- This migration ensures all admin components have proper visibility settings

-- Insert component visibility rules (using ON CONFLICT to handle existing records)
INSERT INTO public.component_visibility (component_name, role, is_visible, created_at, updated_at)
VALUES 
  -- ReportingAccess - Analytics/Reports dashboard
  ('ReportingAccess', 'SuperUser', true, now(), now()),
  ('ReportingAccess', 'Admin', true, now(), now()),
  ('ReportingAccess', 'Booker', false, now(), now()),
  ('ReportingAccess', 'Driver', false, now(), now()),

  -- BookingManagement
  ('BookingManagement', 'SuperUser', true, now(), now()),
  ('BookingManagement', 'Admin', true, now(), now()),
  ('BookingManagement', 'Booker', true, now(), now()),
  ('BookingManagement', 'Driver', false, now(), now()),

  -- BookingAssignment
  ('BookingAssignment', 'SuperUser', true, now(), now()),
  ('BookingAssignment', 'Admin', true, now(), now()),
  ('BookingAssignment', 'Booker', true, now(), now()),
  ('BookingAssignment', 'Driver', false, now(), now()),

  -- ProductManagement
  ('ProductManagement', 'SuperUser', true, now(), now()),
  ('ProductManagement', 'Admin', true, now(), now()),
  ('ProductManagement', 'Booker', false, now(), now()),
  ('ProductManagement', 'Driver', false, now(), now()),

  -- CategoryManagement
  ('CategoryManagement', 'SuperUser', true, now(), now()),
  ('CategoryManagement', 'Admin', true, now(), now()),
  ('CategoryManagement', 'Booker', false, now(), now()),
  ('CategoryManagement', 'Driver', false, now(), now()),

  -- UserManagement
  ('UserManagement', 'SuperUser', true, now(), now()),
  ('UserManagement', 'Admin', true, now(), now()),
  ('UserManagement', 'Booker', false, now(), now()),
  ('UserManagement', 'Driver', false, now(), now()),

  -- VisibilitySettings
  ('VisibilitySettings', 'SuperUser', true, now(), now()),
  ('VisibilitySettings', 'Admin', true, now(), now()),
  ('VisibilitySettings', 'Booker', false, now(), now()),
  ('VisibilitySettings', 'Driver', false, now(), now()),

  -- DriverTasks
  ('DriverTasks', 'SuperUser', true, now(), now()),
  ('DriverTasks', 'Admin', true, now(), now()),
  ('DriverTasks', 'Booker', false, now(), now()),
  ('DriverTasks', 'Driver', true, now(), now()),

  -- TaskMaster
  ('TaskMaster', 'SuperUser', true, now(), now()),
  ('TaskMaster', 'Admin', true, now(), now()),
  ('TaskMaster', 'Booker', false, now(), now()),
  ('TaskMaster', 'Driver', false, now(), now()),

  -- Settings
  ('settings', 'SuperUser', true, now(), now()),
  ('settings', 'Admin', true, now(), now()),
  ('settings', 'Booker', false, now(), now()),
  ('settings', 'Driver', false, now(), now()),

  -- SEO Manager (THIS IS THE KEY FIX)
  ('SeoManager', 'SuperUser', true, now(), now()),
  ('SeoManager', 'Admin', true, now(), now()),
  ('SeoManager', 'Booker', false, now(), now()),
  ('SeoManager', 'Driver', false, now(), now()),

  -- AnalyticsDashboard
  ('AnalyticsDashboard', 'SuperUser', true, now(), now()),
  ('AnalyticsDashboard', 'Admin', true, now(), now()),
  ('AnalyticsDashboard', 'Booker', false, now(), now()),
  ('AnalyticsDashboard', 'Driver', false, now(), now())

ON CONFLICT (component_name, role) 
DO UPDATE SET 
  is_visible = EXCLUDED.is_visible,
  updated_at = now();

-- Verify the data was inserted
DO $$
BEGIN
  RAISE NOTICE 'Component visibility seeding completed. Total records: %', 
    (SELECT COUNT(*) FROM public.component_visibility);
  
  RAISE NOTICE 'SeoManager permissions: SuperUser=%, Admin=%, Booker=%, Driver=%',
    (SELECT is_visible FROM public.component_visibility WHERE component_name = 'SeoManager' AND role = 'SuperUser'),
    (SELECT is_visible FROM public.component_visibility WHERE component_name = 'SeoManager' AND role = 'Admin'),
    (SELECT is_visible FROM public.component_visibility WHERE component_name = 'SeoManager' AND role = 'Booker'),
    (SELECT is_visible FROM public.component_visibility WHERE component_name = 'SeoManager' AND role = 'Driver');
END $$;
