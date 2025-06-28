DO $$
DECLARE
    beach_equipment_category_id UUID;
    baby_equipment_category_id UUID;
BEGIN
    -- Get the UUID for 'Beach Equipment'
    SELECT id INTO beach_equipment_category_id FROM public.equipment_category WHERE name = 'Beach Equipment';

    -- Insert sub-categories for 'Beach Equipment'
    INSERT INTO public.equipment_sub_category (name, category_id) VALUES
    ('Beach Chairs', beach_equipment_category_id),
    ('Shades/Umbrellas', beach_equipment_category_id),
    ('Coolers', beach_equipment_category_id),
    ('Snorkel Gear', beach_equipment_category_id),
    ('Water Safety Gear', beach_equipment_category_id),
    ('Others', beach_equipment_category_id);

    -- Get the UUID for 'Baby Equipment'
    SELECT id INTO baby_equipment_category_id FROM public.equipment_category WHERE name = 'Baby Equipment';

    -- Insert sub-categories for 'Baby Equipment'
    INSERT INTO public.equipment_sub_category (name, category_id) VALUES
    ('Sleep Essentials', baby_equipment_category_id),
    ('Other Sleep Essentials', baby_equipment_category_id),
    ('High Chairs & Baby Chairs', baby_equipment_category_id),
    ('Strollers', baby_equipment_category_id),
    ('Car Seats', baby_equipment_category_id),
    ('Baby mobility and activity equipment', baby_equipment_category_id),
    ('Toys', baby_equipment_category_id),
    ('Beach/Outdoor', baby_equipment_category_id),
    ('Swim Floatation and Safety Gear', baby_equipment_category_id),
    ('Bath Time', baby_equipment_category_id),
    ('Miscellaneous', baby_equipment_category_id);
END $$;