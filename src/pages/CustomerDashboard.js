import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header'; // Changed to named import
import { useAuth } from '@/hooks/useAuth';
const CustomerDashboard = () => {
    const { user } = useAuth();
    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['customer-bookings', user?.id],
        queryFn: async () => {
            if (!user)
                return [];
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          id,
          start_date,
          end_date,
          total_amount,
          status,
          booking_items ( equipment_name, quantity )
        `)
                .eq('user_id', user.id) // Filter bookings for the current user
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
    const getStatusBadgeVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
                return 'default';
            case 'pending':
                return 'secondary';
            case 'completed':
                return 'default'; // Changed from 'success' to 'default'
            case 'cancelled':
                return 'destructive';
            default:
                return 'outline';
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center", children: _jsx("p", { children: "Loading your bookings..." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(Header, {}), _jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-8", children: "My Bookings" }), bookings.length === 0 ? (_jsx(Card, { children: _jsx(CardContent, { className: "p-6 text-center text-gray-600", children: "You have no bookings yet." }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: bookings.map((booking) => (_jsxs(Card, { className: "overflow-hidden flex flex-col", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-lg", children: ["Booking #", booking.id.substring(0, 8)] }), _jsx(Badge, { variant: getStatusBadgeVariant(booking.status), className: "w-fit capitalize", children: booking.status || 'Unknown' })] }), _jsxs(CardContent, { className: "space-y-3 flex-grow", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Dates:" }), _jsxs("p", { className: "text-sm text-gray-600", children: [new Date(booking.start_date).toLocaleDateString(), " - ", new Date(booking.end_date).toLocaleDateString()] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Total Amount:" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["$", booking.total_amount?.toFixed(2) || 'N/A'] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Items:" }), booking.booking_items && booking.booking_items.length > 0 ? (_jsx("ul", { className: "list-disc list-inside text-sm text-gray-600", children: booking.booking_items.map((item, index) => (_jsxs("li", { children: [item.equipment_name, " (x", item.quantity, ")"] }, index))) })) : (_jsx("p", { className: "text-sm text-gray-600", children: "No items in this booking." }))] })] })] }, booking.id))) }))] })] }));
};
export default CustomerDashboard;
