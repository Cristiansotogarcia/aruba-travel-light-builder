-- Insert categories and sub-categories, ignoring if they already exist
INSERT INTO public.equipment_category (name, description) VALUES ('Beach Equipment', 'Equipment for beach activities') ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
    beach_equipment_category_id UUID;
BEGIN
    SELECT id INTO beach_equipment_category_id FROM public.equipment_category WHERE name = 'Beach Equipment';

    INSERT INTO public.equipment_sub_category (name, category_id)
    SELECT * FROM (
        VALUES
            ('Beach Chairs', beach_equipment_category_id),
            ('Coolers', beach_equipment_category_id),
            ('Others', beach_equipment_category_id),
            ('Shades/Umbrellas', beach_equipment_category_id),
            ('Snorkel Gear', beach_equipment_category_id),
            ('Water Safety Gear', beach_equipment_category_id)
    ) AS s(name, category_id)
    ON CONFLICT (name, category_id) DO NOTHING;
END
$$;

-- Update equipment with the correct category and sub-category IDs using subqueries
UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Beach Chairs' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'))
WHERE (name ILIKE '%Chair%') AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Coolers' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'))
WHERE (name ILIKE '%Cooler%') AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Others' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'))
WHERE (name ILIKE '%Wagon%' OR name ILIKE '%Sand Toys%' OR name ILIKE '%Corn Hole%' OR name ILIKE '%Paddle Ball%' OR name ILIKE '%Anchor%' OR name ILIKE '%Dolly%') AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Shades/Umbrellas' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'))
WHERE (name ILIKE '%Umbrella%' OR name ILIKE '%Cabana%' OR name ILIKE '%Canopy%') AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Snorkel Gear' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'))
WHERE (name ILIKE '%Snorkel%') AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Water Safety Gear' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Beach Equipment'))
WHERE (name ILIKE '%Life Jacket%' OR name ILIKE '%Puddle Jumper%') AND category_id IS NULL;