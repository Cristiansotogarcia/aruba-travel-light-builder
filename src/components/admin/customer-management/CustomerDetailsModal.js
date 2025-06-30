import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, Calendar, Package, Edit, Eye, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { EditCustomerModal } from './EditCustomerModal';
import { getStatusColor } from '../calendar/statusUtils';
export const CustomerDetailsModal = ({ open, onClose, customer, onCustomerUpdated, onNavigateToBooking }) => {
    const [showBookings, setShowBookings] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    useEffect(() => {
        if (customer) {
            setBookings(customer.bookings);
        }
    }, [customer]);
    const fetchBookingDetails = async () => {
        if (!customer)
            return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          booking_items (
            equipment_name,
            quantity,
            subtotal,
            equipment_price
          )
        `)
                .eq('customer_email', customer.customer_email)
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            setBookings(data || []);
        }
        catch (error) {
            console.error('Error fetching booking details:', error);
            toast({
                title: "Error",
                description: "Failed to fetch booking details",
                variant: "destructive"
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleViewBookings = () => {
        setShowBookings(true);
        fetchBookingDetails();
    };
    const handleEditCustomer = () => {
        setShowEditModal(true);
    };
    const handleCustomerUpdated = () => {
        onCustomerUpdated();
        setShowEditModal(false);
    };
    const isCurrentBooking = (booking) => {
        const today = new Date();
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        return today >= startDate && today <= endDate;
    };
    if (!customer)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx(Dialog, { open: open && !showBookings, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(User, { className: "h-5 w-5" }), "Customer Details"] }) }), _jsxs("div", { className: "space-y-6", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "p-6 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-gray-500", children: "Name" }), _jsx("div", { className: "text-lg font-semibold", children: customer.customer_name })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium text-gray-500 flex items-center gap-1", children: [_jsx(Mail, { className: "h-3 w-3" }), "Email"] }), _jsx("div", { className: "text-sm", children: customer.customer_email })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium text-gray-500 flex items-center gap-1", children: [_jsx(Phone, { className: "h-3 w-3" }), "Phone"] }), _jsx("div", { className: "text-sm", children: customer.customer_phone })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium text-gray-500 flex items-center gap-1", children: [_jsx(MapPin, { className: "h-3 w-3" }), "Address"] }), _jsx("div", { className: "text-sm", children: customer.customer_address })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4 pt-4 border-t", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-bold text-blue-600", children: customer.bookings.length }), _jsx("div", { className: "text-sm text-gray-500", children: "Total Bookings" })] }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "text-2xl font-bold text-green-600", children: ["$", customer.total_spent] }), _jsx("div", { className: "text-sm text-gray-500", children: "Total Spent" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-sm font-medium text-gray-700", children: "Last Booking" }), _jsx("div", { className: "text-sm text-gray-500", children: format(new Date(customer.last_booking), 'dd/MM/yyyy') })] })] })] }) }), _jsxs("div", { className: "flex gap-3", children: [_jsxs(Button, { onClick: handleViewBookings, className: "flex-1", children: [_jsx(Eye, { className: "h-4 w-4 mr-2" }), "View Bookings"] }), _jsxs(Button, { variant: "outline", onClick: handleEditCustomer, className: "flex-1", children: [_jsx(Edit, { className: "h-4 w-4 mr-2" }), "Edit Customer"] })] })] })] }) }), _jsx(Dialog, { open: showBookings, onOpenChange: () => setShowBookings(false), children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[80vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Package, { className: "h-5 w-5" }), "Bookings for ", customer.customer_name] }) }), _jsx("div", { className: "space-y-4", children: loading ? (_jsx("div", { className: "text-center py-8", children: "Loading bookings..." })) : bookings.length > 0 ? (bookings.map((booking) => (_jsx(Card, { className: "hover:shadow-md transition-shadow", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Badge, { className: getStatusColor(booking.status), children: booking.status.charAt(0).toUpperCase() + booking.status.slice(1) }), isCurrentBooking(booking) && (_jsx(Badge, { variant: "outline", className: "bg-blue-50 text-blue-700 border-blue-200", children: "Current" }))] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "text-lg font-bold", children: ["$", booking.total_amount] }), _jsxs("div", { className: "text-xs text-gray-500", children: ["#", booking.id.substring(0, 8)] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm mb-3", children: [_jsxs("div", { children: [_jsxs("span", { className: "text-gray-500 flex items-center gap-1", children: [_jsx(Calendar, { className: "h-3 w-3" }), "Period:"] }), _jsxs("div", { className: "font-medium", children: [format(new Date(booking.start_date), 'dd/MM/yyyy'), " - ", format(new Date(booking.end_date), 'dd/MM/yyyy')] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Created:" }), _jsx("div", { className: "font-medium", children: format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm') })] })] }), booking.booking_items && booking.booking_items.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-2", children: "Equipment:" }), _jsx("div", { className: "space-y-1", children: booking.booking_items.map((item, index) => (_jsxs("div", { className: "flex justify-between text-sm bg-gray-50 p-2 rounded", children: [_jsxs("span", { children: [item.equipment_name, " \u00D7 ", item.quantity] }), _jsxs("span", { children: ["$", item.subtotal] })] }, index))) })] })), isCurrentBooking(booking) && onNavigateToBooking && (_jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                onNavigateToBooking(booking.id);
                                                setShowBookings(false);
                                                onClose();
                                            }, className: "w-full", children: [_jsx(ExternalLink, { className: "h-3 w-3 mr-2" }), "View in Bookings List"] }))] }) }, booking.id)))) : (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No bookings found for this customer." })) })] }) }), _jsx(EditCustomerModal, { open: showEditModal, onClose: () => setShowEditModal(false), customer: customer, onCustomerUpdated: handleCustomerUpdated })] }));
};
