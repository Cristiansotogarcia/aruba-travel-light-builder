-- Accounting Fields Migration
-- Adds processor fee tracking and net settlement fields to payment_records table

-- Add accounting fields to payment_records table
ALTER TABLE public.payment_records 
ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS processor_fee_percent DECIMAL(5,2) DEFAULT 3.99,
ADD COLUMN IF NOT EXISTS processor_fee_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'AWG',
ADD COLUMN IF NOT EXISTS settlement_date DATE,
ADD COLUMN IF NOT EXISTS statement_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS card_last_four VARCHAR(4),
ADD COLUMN IF NOT EXISTS processor_transaction_id VARCHAR(255);

-- Create indexes for new accounting fields
CREATE INDEX IF NOT EXISTS idx_payment_records_settlement_date ON public.payment_records(settlement_date);
CREATE INDEX IF NOT EXISTS idx_payment_records_statement_ref ON public.payment_records(statement_reference);
CREATE INDEX IF NOT EXISTS idx_payment_records_is_refund ON public.payment_records(is_refund);

-- Create settings table for system configuration (if not exists)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to read settings
CREATE POLICY "Anyone authenticated can read system settings" 
ON public.system_settings FOR SELECT USING (true);

-- Allow admins to insert/update/delete settings (handled by application logic)
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'SuperUser')
    )
);

-- Insert default processor fee setting
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description)
VALUES ('processor_fee_percent', '3.99', 'decimal', 'Default payment processor fee percentage')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default currency setting
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description)
VALUES ('default_currency', 'AWG', 'string', 'Default currency code for transactions')
ON CONFLICT (setting_key) DO NOTHING;