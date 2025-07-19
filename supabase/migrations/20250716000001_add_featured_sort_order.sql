-- Add featured_sort_order column to equipment table
ALTER TABLE public.equipment
ADD COLUMN featured_sort_order INTEGER;