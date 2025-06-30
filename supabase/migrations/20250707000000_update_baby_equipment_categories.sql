INSERT INTO public.equipment_category (name) VALUES ('Baby Equipment') ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
    baby_equipment_category_id UUID;
BEGIN
    SELECT id INTO baby_equipment_category_id FROM public.equipment_category WHERE name = 'Baby Equipment';

    -- Insert sub-categories for Baby Equipment
    INSERT INTO public.equipment_sub_category (name, category_id)
    SELECT * FROM (
        VALUES
            ('Baby mobility and activity equipment', baby_equipment_category_id),
            ('Bath Time', baby_equipment_category_id),
            ('Beach/Outdoor', baby_equipment_category_id),
            ('Car Seats', baby_equipment_category_id),
            ('High Chairs & Baby Chairs', baby_equipment_category_id),
            ('Other Sleep Essentials', baby_equipment_category_id),
            ('Sleep Essentials', baby_equipment_category_id),
            ('Strollers', baby_equipment_category_id),
            ('Toys', baby_equipment_category_id)
    ) AS s(name, category_id)
    ON CONFLICT (name, category_id) DO NOTHING;
END
$$;

-- Update equipment with category and sub-category IDs
UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Baby mobility and activity equipment' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'))
WHERE (name ILIKE '%Walker%' OR
       name ILIKE '%Activity%' OR
       name ILIKE '%Jumper%' OR
       name ILIKE '%Ride on%' OR
       name ILIKE '%Slide%' OR
       name ILIKE '%Rocking Horse%' OR
       name ILIKE '%Play Mat%')
  AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Bath Time' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'))
WHERE (name ILIKE '%Bath%' OR
       name ILIKE '%Pillow%' OR
       name ILIKE '%Gate%' OR
       name ILIKE '%Changing Table%' OR
       name ILIKE '%Warmer%' OR
       name ILIKE '%Sterilizer%')
  AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Beach/Outdoor' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'))
WHERE (name ILIKE '%Play Yard%' OR
       name ILIKE '%Sand Toys%' OR
       name ILIKE '%Float%' OR
       name ILIKE '%Life Jacket%' OR
       name ILIKE '%Puddle Jumper%')
  AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Car Seats' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'))
WHERE (name ILIKE '%Car Seat%' OR
       name ILIKE '%Booster%' OR
       name ILIKE '%Mirror%')
  AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'High Chairs & Baby Chairs' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'))
WHERE (name ILIKE '%High Chair%' OR
       name ILIKE '%Bumbo%' OR
       name ILIKE '%Bouncer%' OR
       name ILIKE '%Table Chair%')
  AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Other Sleep Essentials' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'))
WHERE (name ILIKE '%Sound Machine%' OR
       name ILIKE '%Monitor%')
  AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Sleep Essentials' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'))
WHERE (name ILIKE '%Crib%' OR
       name ILIKE '%Bassinet%' OR
       name ILIKE '%Slumbertod%' OR
       name ILIKE '%Pack and Play%' OR
       name ILIKE '%Slumberpod%' OR
       name ILIKE '%Mattress%' OR
       name ILIKE '%Bed Rail%')
  AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Strollers' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'))
WHERE (name ILIKE '%Stroller%')
  AND category_id IS NULL;

UPDATE public.equipment
SET
    category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'),
    sub_category_id = (SELECT id FROM public.equipment_sub_category WHERE name = 'Toys' AND category_id = (SELECT id FROM public.equipment_category WHERE name = 'Baby Equipment'))
WHERE (name ILIKE '%Toy%' OR
       name ILIKE '%Mega Blok%' OR
       name ILIKE '%Cash Register%' OR
       name ILIKE '%Driver%' OR
       name ILIKE '%Rack-A-Stack%' OR
       name ILIKE '%Drum%' OR
       name ILIKE '%Truck%' OR
       name ILIKE '%Wagon%' OR
       name ILIKE '%Playset%' OR
       name ILIKE '%Bin%')
  AND category_id IS NULL;