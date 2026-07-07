-- Company identifiers for invoice footers (KvK Aruba registration + CRIB tax
-- number). Seeded EMPTY on purpose: the invoice footer only renders them once
-- the owner fills in the real numbers - never invent legal identifiers.
INSERT INTO public.system_settings (setting_key, setting_value, description, is_active)
VALUES
  ('company_registration_number', '', 'KvK Aruba (Chamber of Commerce) registration number, shown on invoices when set', true),
  ('company_tax_number', '', 'CRIB / tax identification number, shown on invoices when set', true)
ON CONFLICT (setting_key) DO NOTHING;
