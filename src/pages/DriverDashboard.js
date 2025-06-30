import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardDescription, CardFooter, CardHeader, CardTitle
import { Button } from '@/components/ui/button';
import { getStatusColor } from '@/components/admin/calendar/statusUtils';
import { Badge } from '@/components/ui/badge';
import { Check, MapPin, Clock } from 'lucide-react'; // Removed AlertCircle, CheckCircle2, Truck, XCircle
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
const DriverDashboard = () => {
    const { user } = useAuth();
    const { toast } = useToast(); // This toast is used
    const queryClient = useQueryClient();
    const { data: deliveries = [] } = useQuery({
        queryKey: ['driver-bookings-today', user?.id],
        queryFn: async () => {
            if (!user)
                return [];
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          id,
          customer_address,
          start_date,
          status,
          assigned_to,
          customer_name,
          customer_email
        `)
                .eq('start_date', today)
                .eq('assigned_to', user.id)
                .order('start_date', { ascending: true });
            if (error)
                throw error;
            return (data || []);
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
    const toggleStatusMutation = useMutation({
        mutationFn: async (bookingId) => {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'completed' })
                .eq('id', bookingId);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['driver-bookings-today'] });
            toast({
                title: 'Booking status updated',
                description: 'The booking has been marked as completed.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Error updating booking status',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(Header, {}), " ", _jsxs("div", { className: "container mx-auto px-4 py-8 max-w-2xl", children: [_jsx("h1", { className: "text-3xl font-bold mb-8", children: "Today's Deliveries" }), deliveries && deliveries.length === 0 ? (_jsx(Card, { children: _jsx(CardContent, { className: "p-6 text-center text-gray-600", children: "No deliveries scheduled for today." }) })) : (_jsx("div", { className: "space-y-4", children: deliveries.map((delivery) => (_jsx(Card, { className: "overflow-hidden", children: _jsx(CardContent, { className: "p-0", children: _jsxs("div", { className: "p-4 space-y-3", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h3", { className: "font-semibold", children: delivery.customer_name || delivery.customer_email || 'Unknown Customer' }), _jsx("div", { className: "flex items-center space-x-2", children: _jsx(Badge, { className: getStatusColor(delivery.status), children: delivery.status }) })] }), delivery.status !== 'completed' && (_jsxs(Button, { size: "sm", onClick: () => toggleStatusMutation.mutate(delivery.id), disabled: toggleStatusMutation.isPending, children: [_jsx(Check, { className: "mr-2 h-4 w-4" }), "Mark Done"] }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-start space-x-2", children: [_jsx(MapPin, { className: "h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" }), _jsx("p", { className: "text-sm text-gray-600", children: delivery.customer_address })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Clock, { className: "h-4 w-4 text-gray-500" }), _jsx("p", { className: "text-sm text-gray-600", children: delivery.start_date })] })] }), delivery.notes && (_jsxs("div", { className: "bg-gray-50 p-3 rounded-lg", children: [_jsx("p", { className: "text-sm font-medium mb-1", children: "Notes:" }), _jsx("p", { className: "text-sm text-gray-600", children: delivery.notes })] }))] }) }) }, delivery.id))) }))] })] }));
};
export default DriverDashboard;
