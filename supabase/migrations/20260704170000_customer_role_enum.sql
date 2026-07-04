-- The app routes /customer-dashboard on role 'Customer', but the enum never
-- had that value — and worse, new signups defaulted to 'Driver'. Part 1: add
-- the enum value (must commit before first use, hence the separate file).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Customer';
