
-- Critical RLS Policies Implementation - Fixed Version
-- Drop all existing policies first to avoid conflicts

-- 1. Profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Admins/SuperUsers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Admins/SuperUsers can update all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser')
  )
);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser')
  )
);

-- 2. Products table policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Anyone can view available products" ON public.products
FOR SELECT USING (availability = true);

CREATE POLICY "Admins can manage products" ON public.products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser')
  )
);

-- 3. Bookings table policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bookings by email" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookers can create and update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookers can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Drivers can update assigned bookings" ON public.bookings;

CREATE POLICY "Users can view bookings by email" ON public.bookings
FOR SELECT USING (
  customer_email = auth.email() OR
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser', 'Booker')
  ) OR
  assigned_to = auth.uid()
);

CREATE POLICY "Admins can manage all bookings" ON public.bookings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser')
  )
);

CREATE POLICY "Bookers can create bookings" ON public.bookings
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Booker', 'Admin', 'SuperUser')
  )
);

CREATE POLICY "Bookers can update bookings" ON public.bookings
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Booker', 'Admin', 'SuperUser')
  )
);

CREATE POLICY "Drivers can update assigned bookings" ON public.bookings
FOR UPDATE USING (
  assigned_to = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'Driver'
  )
);

-- 4. Booking items table policies
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view booking items for accessible bookings" ON public.booking_items;
DROP POLICY IF EXISTS "Admins can manage all booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Bookers can manage booking items" ON public.booking_items;

CREATE POLICY "Users can view booking items for accessible bookings" ON public.booking_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_id
  )
);

CREATE POLICY "Admins can manage all booking items" ON public.booking_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser')
  )
);

CREATE POLICY "Bookers can manage booking items" ON public.booking_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Booker', 'Admin', 'SuperUser')
  )
);

-- 5. Component visibility policies
ALTER TABLE public.component_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their role permissions" ON public.component_visibility;
DROP POLICY IF EXISTS "SuperUsers can manage component visibility" ON public.component_visibility;

CREATE POLICY "Users can view their role permissions" ON public.component_visibility
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = component_visibility.role
  )
);

CREATE POLICY "SuperUsers can manage component visibility" ON public.component_visibility
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'SuperUser'
  )
);

-- 6. Content blocks policies
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active content blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Admins can manage content blocks" ON public.content_blocks;

CREATE POLICY "Anyone can view active content blocks" ON public.content_blocks
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage content blocks" ON public.content_blocks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser')
  )
);

-- 7. Content images policies
ALTER TABLE public.content_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view content images" ON public.content_images;
DROP POLICY IF EXISTS "Admins can manage content images" ON public.content_images;

CREATE POLICY "Anyone can view content images" ON public.content_images
FOR SELECT USING (true);

CREATE POLICY "Admins can manage content images" ON public.content_images
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser')
  )
);

-- 8. User sessions policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON public.user_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser')
  )
);

-- 9. User temp passwords policies
ALTER TABLE public.user_temp_passwords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own temp passwords" ON public.user_temp_passwords;
DROP POLICY IF EXISTS "Admins can manage temp passwords" ON public.user_temp_passwords;

CREATE POLICY "Users can view their own temp passwords" ON public.user_temp_passwords
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage temp passwords" ON public.user_temp_passwords
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperUser')
  )
);
