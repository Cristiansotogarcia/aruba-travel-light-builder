import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Users, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getStatusColor } from './calendar/statusUtils';
export const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalBookings: 0,
        pendingBookings: 0,
        totalRevenue: 0,
        uniqueCustomers: 0,
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetchDashboardData();
    }, []);
    const fetchDashboardData = async () => {
        try {
            // Fetch booking statistics
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('*');
            if (bookingsError)
                throw bookingsError;
            // Calculate stats
            const totalBookings = bookings?.length || 0;
            const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
            const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;
            const uniqueCustomers = new Set(bookings?.map(b => b.customer_email)).size || 0;
            setStats({
                totalBookings,
                pendingBookings,
                totalRevenue,
                uniqueCustomers,
            });
            // Get recent bookings
            const recentBookingsData = bookings
                ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5) || [];
            setRecentBookings(recentBookingsData);
        }
        catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "space-y-6", children: _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [...Array(4)].map((_, i) => (_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-1/2 mb-2" }), _jsx("div", { className: "h-8 bg-gray-200 rounded w-3/4" })] }) }) }, i))) }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Dashboard" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Welcome back! Here's what's happening with your rentals." })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Total Bookings" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.totalBookings })] }), _jsx("div", { className: "h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center", children: _jsx(Calendar, { className: "h-6 w-6 text-blue-600" }) })] }) }) }), _jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Pending Bookings" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.pendingBookings })] }), _jsx("div", { className: "h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center", children: _jsx(Package, { className: "h-6 w-6 text-yellow-600" }) })] }) }) }), _jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Total Revenue" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: ["$", stats.totalRevenue] })] }), _jsx("div", { className: "h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center", children: _jsx(DollarSign, { className: "h-6 w-6 text-green-600" }) })] }) }) }), _jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Customers" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.uniqueCustomers })] }), _jsx("div", { className: "h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center", children: _jsx(Users, { className: "h-6 w-6 text-purple-600" }) })] }) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Recent Bookings" }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-4", children: recentBookings.length > 0 ? (recentBookings.map((booking) => (_jsxs("div", { className: "flex items-center justify-between p-4 border border-gray-200 rounded-lg", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium text-gray-900", children: booking.customer_name }), _jsx("p", { className: "text-sm text-gray-600", children: booking.customer_email }), _jsxs("p", { className: "text-sm text-gray-500", children: [new Date(booking.start_date).toLocaleDateString(), " - ", new Date(booking.end_date).toLocaleDateString()] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Badge, { className: getStatusColor(booking.status), children: booking.status }), _jsxs("p", { className: "font-bold text-gray-900", children: ["$", booking.total_amount] })] })] }, booking.id)))) : (_jsx("p", { className: "text-gray-500 text-center py-8", children: "No bookings yet" })) }) })] })] }));
};
