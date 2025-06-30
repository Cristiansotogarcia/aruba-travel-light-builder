import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LoadingState from '@/components/common/LoadingState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { getStatusColor } from './calendar/statusUtils';
export const BookingAssignment = () => {
    const [bookings, setBookings] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { hasPermission, profile } = useAuth();
    const { toast } = useToast();
    useEffect(() => {
        if (hasPermission('BookingAssignment')) {
            fetchBookings();
            fetchDrivers();
        }
    }, [hasPermission]);
    const fetchBookings = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          booking_items (*)
        `)
                .in('status', ['pending', 'confirmed'])
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            const bookingsWithDefaults = data ? data.map(b => ({ ...b, booking_items: b.booking_items || [] })) : [];
            setBookings(bookingsWithDefaults);
        }
        catch (error) {
            console.error('Error fetching bookings:', error);
            toast({
                title: "Error",
                description: "Failed to load bookings",
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const fetchDrivers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('role', 'Driver');
            if (error)
                throw error;
            setDrivers(data || []);
        }
        catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };
    const assignBooking = async (bookingId, driverId) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ assigned_to: driverId })
                .eq('id', bookingId);
            if (error)
                throw error;
            setBookings(prev => prev.map(booking => booking.id === bookingId
                ? { ...booking, assigned_to: driverId, booking_items: booking.booking_items || [] }
                : booking));
            toast({
                title: "Success",
                description: "Booking assigned successfully",
            });
        }
        catch (error) {
            console.error('Error assigning booking:', error);
            toast({
                title: "Error",
                description: "Failed to assign booking",
                variant: "destructive",
            });
        }
    };
    if (!hasPermission('BookingAssignment')) {
        return (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500", children: "You don't have permission to access booking assignment." }) }));
    }
    const unassignedBookings = bookings.filter(booking => !booking.assigned_to);
    const myAssignments = profile?.role === 'Booker'
        ? bookings.filter(booking => booking.assigned_to === profile.id)
        : [];
    return (_jsx(LoadingState, { isLoading: loading, message: "Loading bookings...", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Booking Assignment" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Assign bookings to drivers for delivery and pickup" })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(UserCheck, { className: "h-5 w-5" }), "Unassigned Bookings (", unassignedBookings.length, ")"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-4", children: unassignedBookings.length > 0 ? (unassignedBookings.map((booking) => (_jsxs("div", { className: "flex items-center justify-between p-4 border border-gray-200 rounded-lg", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h3", { className: "font-medium text-gray-900", children: booking.customer_name }), _jsx(Badge, { className: getStatusColor(booking.status), children: booking.status })] }), _jsxs("div", { className: "flex items-center gap-4 text-sm text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Calendar, { className: "h-4 w-4" }), new Date(booking.start_date).toLocaleDateString(), " - ", new Date(booking.end_date).toLocaleDateString()] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(MapPin, { className: "h-4 w-4" }), booking.customer_address] }), _jsxs("span", { className: "font-medium", children: ["$", booking.total_amount] })] })] }), _jsx("div", { className: "flex items-center gap-3", children: _jsxs(Select, { onValueChange: (driverId) => assignBooking(booking.id, driverId), children: [_jsx(SelectTrigger, { className: "w-40", children: _jsx(SelectValue, { placeholder: "Assign driver" }) }), _jsx(SelectContent, { children: drivers.map(driver => (_jsx(SelectItem, { value: driver.id, children: driver.name }, driver.id))) })] }) })] }, booking.id)))) : (_jsx("p", { className: "text-gray-500 text-center py-8", children: "No unassigned bookings" })) }) })] }), profile?.role === 'Booker' && (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["My Assignments (", myAssignments.length, ")"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-4", children: myAssignments.length > 0 ? (myAssignments.map((booking) => (_jsxs("div", { className: "flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-blue-50", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h3", { className: "font-medium text-gray-900", children: booking.customer_name }), _jsx(Badge, { className: getStatusColor(booking.status), children: booking.status })] }), _jsxs("div", { className: "flex items-center gap-4 text-sm text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Calendar, { className: "h-4 w-4" }), new Date(booking.start_date).toLocaleDateString(), " - ", new Date(booking.end_date).toLocaleDateString()] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(MapPin, { className: "h-4 w-4" }), booking.customer_address] }), _jsxs("span", { className: "font-medium", children: ["$", booking.total_amount] })] })] }), _jsx(Button, { variant: "outline", size: "sm", children: "View Details" })] }, booking.id)))) : (_jsx("p", { className: "text-gray-500 text-center py-8", children: "No assignments yet" })) }) })] }))] }) }));
};
