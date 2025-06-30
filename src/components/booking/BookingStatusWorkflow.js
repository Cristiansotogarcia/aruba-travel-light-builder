import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react'; // Added React import
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast'; // Added useToast import
import { useQueryClient } from '@tanstack/react-query'; // Added useQueryClient import
const statusTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered', 'undeliverable'],
    delivered: ['completed'],
    completed: [],
    cancelled: [],
    undeliverable: ['out_for_delivery', 'cancelled']
};
// Renamed the first component to avoid conflict
export function BookingStatusDisplay({ bookingId }) {
    const [currentStatus, setCurrentStatus] = useState('pending');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const fetchStatus = async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('status')
                .eq('id', bookingId)
                .single();
            if (!error && data?.status) {
                setCurrentStatus(data.status);
            }
        };
        fetchStatus();
    }, [bookingId]);
    const handleStatusUpdate = async (newStatus) => {
        setLoading(true);
        const { error } = await supabase
            .from('bookings')
            .update({ status: newStatus })
            .eq('id', bookingId);
        if (!error) {
            setCurrentStatus(newStatus);
        }
        setLoading(false);
    };
    return (_jsxs("div", { className: "space-y-4 p-4 border rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium", children: "Current Status:" }), _jsx(Badge, { variant: currentStatus === 'cancelled' ? 'destructive' : 'default', children: currentStatus.replace(/_/g, ' ').toUpperCase() })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: statusTransitions[currentStatus].map((status) => (_jsx(Button, { variant: "outline", onClick: () => handleStatusUpdate(status), disabled: loading, className: "transition-colors duration-200", children: status === 'out_for_delivery' ? 'Mark as Out for Delivery' :
                        status.replace(/_/g, ' ').toUpperCase() }, status))) })] }));
}
export const BookingStatusWorkflow = ({ booking, onUpdate, availableStatuses }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const handleStatusChange = async (newStatus) => {
        if (!booking || !booking.id) {
            toast({ title: 'Error', description: 'Booking ID is missing.', variant: 'destructive' });
            return;
        }
        try {
            const { data: currentBooking, error: fetchError } = await supabase
                .from('bookings')
                .select('*, booking_items(*, equipment:products!equipment_id(*))')
                .eq('id', booking.id)
                .single();
            if (fetchError || !currentBooking) {
                toast({ title: 'Error', description: `Failed to fetch booking details: ${fetchError?.message || 'Booking not found.'}`, variant: 'destructive' });
                return;
            }
            const { error: updateError } = await supabase
                .from('bookings')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', booking.id);
            if (updateError) {
                throw updateError;
            }
            toast({ title: 'Success', description: `Booking status updated to ${newStatus}.` });
            onUpdate(booking.id, newStatus);
            queryClient.invalidateQueries({ queryKey: ['bookings', booking.id] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['driverBookings'] });
            if (currentBooking.customer_email) {
                const equipmentDetails = currentBooking.booking_items?.map(item => {
                    // Type guard to ensure item.equipment is not an error and has a name property
                    if (item.equipment && typeof item.equipment === 'object' && 'name' in item.equipment) {
                        return `${item.equipment.name} (x${item.quantity})`;
                    }
                    return `Unknown Equipment (x${item.quantity})`;
                }).join(', ') || 'N/A';
                const { error: functionError } = await supabase.functions.invoke('booking-status-update-email', {
                    body: {
                        customer_email: currentBooking.customer_email,
                        customer_name: currentBooking.customer_name,
                        booking_id: currentBooking.id,
                        new_status: newStatus,
                        old_status: currentBooking.status, // Cast to BookingStatus
                        start_date: currentBooking.start_date,
                        equipment_details: equipmentDetails,
                    },
                });
                if (functionError) {
                    toast({ title: 'Email Error', description: `Failed to send status update email: ${functionError.message}`, variant: 'destructive' });
                    console.error('Error invoking email function from BookingStatusWorkflow:', functionError);
                }
            }
        }
        catch (error) {
            console.error('Error updating booking status in workflow:', error);
            toast({ title: 'Error', description: `Failed to update status: ${error.message}`, variant: 'destructive' });
        }
    };
    // Added return statement with JSX
    if (!booking) {
        return _jsx("p", { children: "No booking selected." });
    }
    return (_jsx("div", { className: "flex flex-wrap gap-2", children: availableStatuses.map((status) => (_jsx(Button, { variant: "outline", onClick: () => handleStatusChange(status), 
            // disabled={loading} // Consider adding a loading state if this component becomes complex
            className: "transition-colors duration-200", children: status.replace(/_/g, ' ').toUpperCase() }, status))) }));
};
