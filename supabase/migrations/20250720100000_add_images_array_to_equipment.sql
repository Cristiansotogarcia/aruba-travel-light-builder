-- Add images array to equipment table and migrate existing image_url data
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

UPDATE public.equipment
  SET images = ARRAY[image_url]
  WHERE image_url IS NOT NULL AND (images IS NULL OR array_length(images,1) = 0);

ALTER TABLE public.equipment
  DROP COLUMN IF EXISTS image_url;
