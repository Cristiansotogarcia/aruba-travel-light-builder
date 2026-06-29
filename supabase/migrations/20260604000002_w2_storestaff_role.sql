-- W2: add the Store-staff role.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'StoreStaff';
