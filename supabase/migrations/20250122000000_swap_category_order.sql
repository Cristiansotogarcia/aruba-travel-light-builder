-- Swap the order of Beach Equipment and Baby Equipment
-- Beach Equipment should be first (sort_order = 0)
-- Baby Equipment should be second (sort_order = 1)

UPDATE public.equipment_category 
SET sort_order = 0 
WHERE name = 'Beach Equipment';

UPDATE public.equipment_category 
SET sort_order = 1 
WHERE name = 'Baby Equipment';

-- Ensure other categories have higher sort_order values
UPDATE public.equipment_category 
SET sort_order = 2 
WHERE name NOT IN ('Beach Equipment', 'Baby Equipment') AND sort_order IS NULL;