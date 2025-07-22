-- Update category order to show Beach Equipment first
-- This migration swaps the sort_order of Beach Equipment and Baby Equipment

UPDATE public.equipment_category 
SET sort_order = 0 
WHERE name = 'Beach Equipment';

UPDATE public.equipment_category 
SET sort_order = 1 
WHERE name = 'Baby Equipment';
