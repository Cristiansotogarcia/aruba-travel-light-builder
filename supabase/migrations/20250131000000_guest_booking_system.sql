-- Guest Booking System Migration
-- Enables guest bookings with admin confirmation and delivery slot management

-- ============================================
-- 1. CREATE DELIVERY SLOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.delivery_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL CHECK (time_slot IN ('morning', 'afternoon')),
    bookings_count INTEGER DEFAULT 0,
    max_bookings INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(delivery_date, time_slot)
);

-- Create indexes for delivery slots
CREATE INDEX IF NOT EXISTS idx_delivery_slots_date ON public.delivery_slots(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_slots_date_slot ON public.delivery_slots(delivery_date, time_slot);

-- ============================================
-- 2. UPDATE BOOKINGS TABLE
-- ============================================
-- Add new columns for guest booking flow
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS delivery_slot VARCHAR(20) CHECK (delivery_slot IN ('morning', 'afternoon')),
    ADD COLUMN IF NOT EXISTS admin_confirmed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS admin_confirmed_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS payment_link_url TEXT,
    ADD COLUMN IF NOT EXISTS payment_link_generated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reservation_email_sent_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_slot ON public.bookings(delivery_slot);
CREATE INDEX IF NOT EXISTS idx_bookings_admin_confirmed ON public.bookings(admin_confirmed_at);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_link_expires ON public.bookings(payment_link_expires_at);

-- Make user_id nullable to support guest bookings
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

-- ============================================
-- 3. CREATE ADMIN NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type VARCHAR(50) NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    read_by UUID REFERENCES public.profiles(id),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for admin notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_booking ON public.admin_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON public.admin_notifications(priority);

-- ============================================
-- 4. CREATE FUNCTIONS
-- ============================================

-- Function: Check delivery slot availability
CREATE OR REPLACE FUNCTION public.check_delivery_slot_availability(
    p_delivery_date DATE,
    p_time_slot VARCHAR(20)
)
RETURNS TABLE(
    available BOOLEAN,
    current_count INTEGER,
    max_bookings INTEGER,
    remaining_slots INTEGER
) AS $$
DECLARE
    v_current_count INTEGER;
    v_max_bookings INTEGER := 3;
BEGIN
    -- Count current bookings for this slot (excluding cancelled/rejected)
    SELECT COUNT(*) INTO v_current_count
    FROM public.bookings
    WHERE DATE(start_date) = p_delivery_date
        AND delivery_slot = p_time_slot
        AND status NOT IN ('cancelled', 'rejected');
    
    RETURN QUERY
    SELECT 
        (v_current_count < v_max_bookings) AS available,
        v_current_count AS current_count,
        v_max_bookings AS max_bookings,
        (v_max_bookings - v_current_count) AS remaining_slots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update delivery slot counter
CREATE OR REPLACE FUNCTION public.update_delivery_slot_counter()
RETURNS TRIGGER AS $$
DECLARE
    v_date DATE;
    v_slot VARCHAR(20);
    v_count INTEGER;
BEGIN
    -- Determine which date and slot to update
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_date := DATE(NEW.start_date);
        v_slot := NEW.delivery_slot;
    ELSIF TG_OP = 'DELETE' THEN
        v_date := DATE(OLD.start_date);
        v_slot := OLD.delivery_slot;
    END IF;
    
    -- Only process if slot is specified
    IF v_slot IS NOT NULL THEN
        -- Count active bookings for this slot
        SELECT COUNT(*) INTO v_count
        FROM public.bookings
        WHERE DATE(start_date) = v_date
            AND delivery_slot = v_slot
            AND status NOT IN ('cancelled', 'rejected');
        
        -- Insert or update delivery slot record
        INSERT INTO public.delivery_slots (delivery_date, time_slot, bookings_count, updated_at)
        VALUES (v_date, v_slot, v_count, NOW())
        ON CONFLICT (delivery_date, time_slot)
        DO UPDATE SET 
            bookings_count = v_count,
            updated_at = NOW();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for delivery slot counter
DROP TRIGGER IF EXISTS trigger_update_delivery_slot_counter ON public.bookings;
CREATE TRIGGER trigger_update_delivery_slot_counter
    AFTER INSERT OR UPDATE OF delivery_slot, status OR DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_delivery_slot_counter();

-- Function: Create admin notification for new reservation
CREATE OR REPLACE FUNCTION public.create_new_reservation_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification for new pending_admin_review bookings
    IF NEW.status = 'pending_admin_review' THEN
        INSERT INTO public.admin_notifications (
            notification_type,
            booking_id,
            title,
            message,
            priority,
            metadata
        ) VALUES (
            'new_reservation',
            NEW.id,
            'New Reservation Pending Review',
            format('New reservation from %s for %s', NEW.customer_name, NEW.customer_email),
            'high',
            jsonb_build_object(
                'customer_name', NEW.customer_name,
                'customer_email', NEW.customer_email,
                'start_date', NEW.start_date,
                'delivery_slot', NEW.delivery_slot,
                'total_amount', NEW.total_amount
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new reservation notifications
DROP TRIGGER IF EXISTS trigger_new_reservation_notification ON public.bookings;
CREATE TRIGGER trigger_new_reservation_notification
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.create_new_reservation_notification();

-- Function: Get delivery slots for date range
CREATE OR REPLACE FUNCTION public.get_delivery_slots_availability(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    delivery_date DATE,
    morning_available BOOLEAN,
    morning_count INTEGER,
    morning_remaining INTEGER,
    afternoon_available BOOLEAN,
    afternoon_count INTEGER,
    afternoon_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.date AS delivery_date,
        ms.available AS morning_available,
        ms.current_count AS morning_count,
        ms.remaining_slots AS morning_remaining,
        af.available AS afternoon_available,
        af.current_count AS afternoon_count,
        af.remaining_slots AS afternoon_remaining
    FROM (
        SELECT generate_series(p_start_date::timestamp, p_end_date::timestamp, '1 day'::interval)::DATE AS date
    ) AS ds
    CROSS JOIN LATERAL public.check_delivery_slot_availability(ds.date, 'morning') ms
    CROSS JOIN LATERAL public.check_delivery_slot_availability(ds.date, 'afternoon') af
    ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_slots
CREATE POLICY "Public can view delivery slots" ON public.delivery_slots
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage delivery slots" ON public.delivery_slots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Admin', 'SuperUser')
        )
    );

-- RLS Policies for admin_notifications
CREATE POLICY "Admins can view all notifications" ON public.admin_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Admin', 'SuperUser', 'Booker')
        )
    );

CREATE POLICY "System can insert notifications" ON public.admin_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update notifications" ON public.admin_notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Admin', 'SuperUser', 'Booker')
        )
    );

-- Update RLS for bookings to allow guest bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Admin', 'SuperUser', 'Booker', 'Driver')
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Anyone can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (true); -- Allow guest bookings

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON public.delivery_slots TO anon, authenticated;
GRANT SELECT ON public.admin_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_delivery_slot_availability TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_slots_availability TO anon, authenticated;

-- ============================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.delivery_slots IS 'Tracks delivery slot availability per date and time slot';
COMMENT ON TABLE public.admin_notifications IS 'Stores notifications for admin users about system events';
COMMENT ON COLUMN public.bookings.delivery_slot IS 'Time slot for delivery: morning or afternoon';
COMMENT ON COLUMN public.bookings.admin_confirmed_at IS 'Timestamp when admin confirmed the reservation';
COMMENT ON COLUMN public.bookings.payment_link_url IS 'Stripe payment link URL sent to customer';
COMMENT ON COLUMN public.bookings.reservation_email_sent_at IS 'Timestamp when reservation confirmation email was sent';
COMMENT ON FUNCTION public.check_delivery_slot_availability IS 'Checks if a delivery slot is available for booking';
COMMENT ON FUNCTION public.get_delivery_slots_availability IS 'Returns availability for all slots in a date range';
