-- Create equipment table for bulk CSV uploads
CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_per_day numeric NOT NULL DEFAULT 0,
  category text NOT NULL,
  images text[] DEFAULT '{}',
  stock_quantity integer NOT NULL DEFAULT 0,
  availability boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  image_url text,
  availability_status text DEFAULT 'Available',
  featured boolean NOT NULL DEFAULT false
);
