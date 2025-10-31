-- Fix cascade delete issue with booking audit log
-- The issue: AFTER DELETE trigger tries to insert audit log after booking is deleted,
-- causing foreign key violation. Solution: Don't create audit logs for DELETE operations
-- since they'll be cascade deleted anyway.

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_booking_audit_log ON public.bookings;

-- Recreate the audit trigger function to skip DELETE operations
CREATE OR REPLACE FUNCTION public.create_booking_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip audit log creation for DELETE operations since the audit logs
    -- will be cascade deleted anyway and trying to insert causes FK violations
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

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
            NEW.id,
            auth.uid(),
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'CREATE'
                WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for INSERT and UPDATE only (not DELETE)
CREATE TRIGGER trigger_booking_audit_log
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.create_booking_audit_log();

-- Add comment explaining the design decision
COMMENT ON FUNCTION public.create_booking_audit_log() 
    IS 'Creates audit log entries for booking changes. Skips DELETE operations to avoid FK violations since audit logs are cascade deleted.';
