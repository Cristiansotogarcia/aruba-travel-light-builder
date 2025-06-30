import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query'; // Removed useMutation and useQueryClient
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header'; // Changed Navigation to Header
import { useAuth } from '@/hooks/useAuth';
// Assuming a similar structure to DriverToday, but for Booker
const BookerDashboard = () => {
    const { user } = useAuth();
    // const { toast } = useToast(); // Removed unused variable
    // const queryClient = useQueryClient(); // Removed unused variable
    // Example: Fetch bookings assigned to this booker or all bookings if admin/booker role
    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['booker-bookings', user?.id], // Differentiate queryKey from driver
        queryFn: async () => {
            if (!user)
                return [];
            // Adjust the query based on what a Booker needs to see
            // This is a placeholder and needs to be adapted to your actual schema and logic
            const { data, error } = await supabase
                .from('bookings') // Assuming 'bookings' table
                .select(`
          id,
          customer_name,
          customer_email,
          start_date,
          end_date,
          total_amount,
          status,
          booking_items ( equipment_name, quantity )
        `)
                // Add filters if necessary, e.g., by status or date range
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
    // Example: Mutation to update booking status (e.g., confirm, cancel)
    // const updateBookingStatusMutation = useMutation({
    //   mutationFn: async ({ bookingId, newStatus }: { bookingId: string, newStatus: string }) => {
    //     const { error } = await supabase
    //       .from('bookings')
    //       .update({ status: newStatus })
    //       .eq('id', bookingId);
    //     if (error) throw error;
    //   },
    //   onSuccess: () => {
    //     queryClient.invalidateQueries({ queryKey: ['booker-bookings'] });
    //     toast({
    //       title: 'Booking status updated',
    //       description: 'The booking status has been successfully updated.',
    //     });
    //   },
    //   onError: (error: Error) => {
    //     toast({
    //       title: 'Error updating booking status',
    //       description: error.message,
    //       variant: 'destructive',
    //     });
    //   },
    // });
    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'confirmed':
                return 'default'; // Green or similar for positive status
            case 'pending':
                return 'secondary'; // Yellow or similar for pending
            case 'cancelled':
                return 'destructive'; // Red for negative status
            default:
                return 'outline';
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center", children: _jsx("p", { children: "Loading dashboard..." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(Header, {}), _jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-8", children: "Booker Dashboard" }), bookings.length === 0 ? (_jsx(Card, { children: _jsx(CardContent, { className: "p-6 text-center text-gray-600", children: "No bookings found." }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: bookings.map((booking) => (_jsxs(Card, { className: "overflow-hidden flex flex-col", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-lg", children: ["Booking #", booking.id.substring(0, 8)] }), _jsx(Badge, { variant: getStatusBadgeVariant(booking.status), className: "w-fit", children: booking.status })] }), _jsxs(CardContent, { className: "space-y-3 flex-grow", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Customer:" }), _jsxs("p", { className: "text-sm text-gray-600", children: [booking.customer_name, " (", booking.customer_email, ")"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Dates:" }), _jsxs("p", { className: "text-sm text-gray-600", children: [new Date(booking.start_date).toLocaleDateString(), " - ", new Date(booking.end_date).toLocaleDateString()] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Total Amount:" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["$", booking.total_amount.toFixed(2)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Items:" }), _jsx("ul", { className: "list-disc list-inside text-sm text-gray-600", children: booking.booking_items.map((item, index) => (_jsxs("li", { children: [item.equipment_name, " (x", item.quantity, ")"] }, index))) })] })] })] }, booking.id))) }))] })] }));
};
export default BookerDashboard;
