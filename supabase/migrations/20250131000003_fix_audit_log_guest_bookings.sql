-- Fix audit log to support guest bookings
-- Makes user_id nullable in booking_audit_log and updates trigger

-- Step 1: Make user_id nullable in booking_audit_log
ALTER TABLE public.booking_audit_log 
    ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Update the audit trigger function to handle guest bookings
CREATE OR REPLACE FUNCTION public.create_booking_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create audit log if there's an authenticated user
    -- Skip audit logging for guest bookings (when auth.uid() is NULL)
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.booking_audit_log (
            booking_id,
            user_id,
            action,
            old_status,
            new_status,
            metadata
        ) VALUES (
            COALESCE(NEW.id, OLD.id),
            auth.uid(), -- Will be NULL for guest bookings, which is now allowed
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
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON COLUMN public.booking_audit_log.user_id 
    IS 'User who performed the action. NULL for system actions or guest bookings.';
