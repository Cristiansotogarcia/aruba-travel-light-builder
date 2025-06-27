-- Initial schema with core tables
-- Creates base tables required by the application

-- Role enumeration
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('SuperUser', 'Admin', 'Booker', 'Driver');

-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_per_day numeric NOT NULL DEFAULT 0,
  category text NOT NULL,
  images text[] DEFAULT '{}',
  stock_quantity integer NOT NULL DEFAULT 0,
  availability boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'Booker',
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  needs_password_change boolean DEFAULT false,
  is_deactivated boolean DEFAULT false
);

-- Bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL,
  assigned_to uuid REFERENCES public.profiles(id),
  delivery_failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Booking items table
CREATE TABLE public.booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES public.products(id),
  equipment_name text NOT NULL,
  equipment_price numeric NOT NULL,
  quantity integer NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Component visibility table
CREATE TABLE public.component_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_name text NOT NULL,
  role public.app_role NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Content blocks table
CREATE TABLE public.content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_key text NOT NULL,
  title text NOT NULL,
  page_slug text NOT NULL,
  block_type text NOT NULL,
  content text,
  metadata jsonb,
  sort_order integer,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Content images table
CREATE TABLE public.content_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_key text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User sessions table
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  session_token text NOT NULL,
  ip_address text,
  user_agent text,
  last_activity timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Temporary passwords table
CREATE TABLE public.user_temp_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  temp_password text NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

