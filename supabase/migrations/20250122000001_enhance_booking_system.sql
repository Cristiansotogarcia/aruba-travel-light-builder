-- Enhanced Booking System Migration
-- Adds payment tracking, audit logging, and stock management capabilities

-- Add payment tracking fields to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS delivery_scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create comprehensive indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON public.bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_driver ON public.bookings(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON public.bookings(status, start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_schedule ON public.bookings(delivery_scheduled_at) WHERE delivery_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_metadata ON public.bookings USING GIN(metadata);

-- Add stock management fields to equipment table (assuming equipment table exists)
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER DEFAULT 0;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Create payment records table
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    stripe_metadata JSONB DEFAULT '{}'::jsonb,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment records
CREATE INDEX IF NOT EXISTS idx_payment_records_booking_id ON public.payment_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_stripe_session ON public.payment_records(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON public.payment_records(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_records_stripe_intent ON public.payment_records(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Create booking audit log table
CREATE TABLE IF NOT EXISTS public.booking_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_booking_id ON public.booking_audit_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.booking_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.booking_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.booking_audit_log(action);

-- Create stock movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'reservation', 'release', 'adjustment', 'damage', 'maintenance'
    quantity_change INTEGER NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    reason TEXT,
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_equipment_id ON public.stock_movements(equipment_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_booking_id ON public.stock_movements(booking_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment records
CREATE POLICY "Users can view payment records for their bookings" ON public.payment_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = payment_records.booking_id
            AND (
                bookings.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('Admin', 'SuperUser')
                )
            )
        )
    );

CREATE POLICY "System can insert payment records" ON public.payment_records
    FOR INSERT WITH CHECK (true);

-- RLS Policies for audit log
CREATE POLICY "Users can view audit logs for their bookings" ON public.booking_audit_log
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE bookings.id = booking_audit_log.booking_id 
            AND bookings.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Admin', 'SuperUser')
        )
    );

CREATE POLICY "Authenticated users can insert audit logs" ON public.booking_audit_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stock movements
CREATE POLICY "Admins can view all stock movements" ON public.stock_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Admin', 'SuperUser')
        )
    );

CREATE POLICY "System can insert stock movements" ON public.stock_movements
    FOR INSERT WITH CHECK (true);

-- Grant appropriate permissions
GRANT SELECT, INSERT ON public.payment_records TO authenticated;
GRANT SELECT, INSERT ON public.booking_audit_log TO authenticated;
GRANT SELECT ON public.stock_movements TO authenticated;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.create_booking_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.booking_audit_log (
        booking_id,
        user_id,
        action,
        old_status,
        new_status,
        metadata
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
        END,
        OLD.status,
        NEW.status,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'changed_fields', CASE 
                WHEN TG_OP = 'UPDATE' THEN (
                    SELECT jsonb_object_agg(key, value)
                    FROM jsonb_each(to_jsonb(NEW))
                    WHERE value != (to_jsonb(OLD) -> key)
                )
                ELSE NULL
            END
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger
CREATE TRIGGER trigger_booking_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.create_booking_audit_log();

-- Function to reserve equipment stock
CREATE OR REPLACE FUNCTION public.reserve_equipment_stock(
    p_equipment_id UUID,
    p_quantity INTEGER,
    p_booking_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INTEGER;
    current_reserved INTEGER;
BEGIN
    -- Get current stock levels
    SELECT stock_quantity, COALESCE(reserved_quantity, 0)
    INTO current_stock, current_reserved
    FROM public.equipment
    WHERE id = p_equipment_id
    FOR UPDATE;
    
    -- Check if enough stock available
    IF (current_stock - current_reserved) < p_quantity THEN
        RETURN FALSE;
    END IF;
    
    -- Update reserved quantity
    UPDATE public.equipment
    SET reserved_quantity = current_reserved + p_quantity
    WHERE id = p_equipment_id;
    
    -- Log stock movement
    INSERT INTO public.stock_movements (
        equipment_id,
        booking_id,
        movement_type,
        quantity_change,
        stock_before,
        stock_after,
        reason,
        performed_by
    ) VALUES (
        p_equipment_id,
        p_booking_id,
        'reservation',
        p_quantity,
        current_stock - current_reserved,
        current_stock - current_reserved - p_quantity,
        'Equipment reserved for booking',
        auth.uid()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release reserved stock
CREATE OR REPLACE FUNCTION public.release_equipment_stock(
    p_equipment_id UUID,
    p_quantity INTEGER,
    p_booking_id UUID,
    p_reason TEXT DEFAULT 'Stock released'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INTEGER;
    current_reserved INTEGER;
BEGIN
    -- Get current stock levels
    SELECT stock_quantity, COALESCE(reserved_quantity, 0)
    INTO current_stock, current_reserved
    FROM public.equipment
    WHERE id = p_equipment_id
    FOR UPDATE;
    
    -- Update reserved quantity
    UPDATE public.equipment
    SET reserved_quantity = GREATEST(0, current_reserved - p_quantity)
    WHERE id = p_equipment_id;
    
    -- Log stock movement
    INSERT INTO public.stock_movements (
        equipment_id,
        booking_id,
        movement_type,
        quantity_change,
        stock_before,
        stock_after,
        reason,
        performed_by
    ) VALUES (
        p_equipment_id,
        p_booking_id,
        'release',
        -p_quantity,
        current_stock - current_reserved,
        current_stock - GREATEST(0, current_reserved - p_quantity),
        p_reason,
        auth.uid()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.reserve_equipment_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_equipment_stock TO authenticated;

-- Update equipment availability status based on stock
CREATE OR REPLACE FUNCTION public.update_equipment_availability()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.equipment 
    SET availability_status = CASE 
        WHEN (stock_quantity - COALESCE(reserved_quantity, 0)) <= 0 THEN 'Out of Stock'
        WHEN (stock_quantity - COALESCE(reserved_quantity, 0)) <= low_stock_threshold THEN 'Low Stock'
        ELSE 'Available'
    END
    WHERE id = NEW.equipment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for equipment availability updates
CREATE TRIGGER trigger_update_equipment_availability
    AFTER INSERT OR UPDATE ON public.stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_equipment_availability();
