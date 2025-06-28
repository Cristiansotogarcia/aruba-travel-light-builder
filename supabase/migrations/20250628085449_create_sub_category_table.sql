CREATE TABLE public.equipment_sub_category (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.equipment_category(id) ON DELETE CASCADE,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.equipment
ADD COLUMN sub_category_id UUID REFERENCES public.equipment_sub_category(id) ON DELETE SET NULL;
