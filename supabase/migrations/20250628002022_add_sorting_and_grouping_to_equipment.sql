ALTER TABLE public.equipment_category
ADD COLUMN sort_order INTEGER;

ALTER TABLE public.equipment
ADD COLUMN sub_category TEXT;

ALTER TABLE public.equipment
ADD COLUMN sort_order INTEGER;
