import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Eye, Truck, Package } from 'lucide-react';
import { format } from 'date-fns';
import { CreateBookingModal } from '../CreateBookingModal';
import { getStatusColor } from './statusUtils';
import { getBookingsByTypeForDate } from './bookingUtils';
export const DayPopupDialog = ({ isOpen, onClose, selectedDate, bookings, onCreateBooking, onViewBooking }) => {
    if (!selectedDate)
        return null;
    const { deliveries, pickups } = getBookingsByTypeForDate(bookings, selectedDate);
    const totalCount = deliveries.length + pickups.length;
    const handleViewBooking = (booking) => {
        onViewBooking(booking);
        onClose(); // Auto-close the day popup for cleaner flow
    };
    const getDeliveryStatusLabel = (status) => {
        switch (status) {
            case 'out_for_delivery':
                return 'Out for Delivery';
            case 'delivered':
                return 'Delivered';
            default:
                return 'Scheduled';
        }
    };
    const getPickupStatusLabel = (status) => {
        switch (status) {
            case 'completed':
                return 'Picked Up';
            default:
                return 'Scheduled';
        }
    };
    const renderBookingSection = (sectionBookings, emptyMessage, isDelivery = true) => {
        if (sectionBookings.length === 0) {
            return (_jsx("div", { className: "text-center py-4 text-gray-500 text-sm", children: emptyMessage }));
        }
        return (_jsx("div", { className: "space-y-3", children: sectionBookings.map((booking) => (_jsx(Card, { children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold", children: booking.customer_name }), _jsxs("p", { className: "text-sm text-gray-500", children: [format(new Date(booking.start_date), 'dd/MM/yyyy'), " - ", format(new Date(booking.end_date), 'dd/MM/yyyy')] })] }), _jsxs("div", { className: "text-right flex items-center gap-2", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-bold", children: ["$", booking.total_amount] }), _jsx(Badge, { className: getStatusColor(booking.status), children: isDelivery ? getDeliveryStatusLabel(booking.status) : getPickupStatusLabel(booking.status) })] }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => handleViewBooking(booking), children: _jsx(Eye, { className: "h-4 w-4" }) })] })] }) }) }, booking.id))) }));
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[80vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Equipment Schedule for ", format(selectedDate, 'EEEE, dd/MM/yyyy')] }) }), totalCount > 0 ? (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg", children: [_jsx(Truck, { className: "h-5 w-5 text-green-600" }), _jsxs("h3", { className: "font-semibold text-lg text-green-800", children: ["Deliveries (", deliveries.length, ")"] })] }), renderBookingSection(deliveries, "No deliveries scheduled for this day", true)] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg", children: [_jsx(Package, { className: "h-5 w-5 text-orange-600" }), _jsxs("h3", { className: "font-semibold text-lg text-orange-800", children: ["Pickups (", pickups.length, ")"] })] }), renderBookingSection(pickups, "No pickups scheduled for this day", false)] })] })) : (_jsxs("div", { className: "text-center py-8", children: [_jsx(Calendar, { className: "h-12 w-12 text-gray-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No equipment activities" }), _jsxs("p", { className: "text-gray-500 mb-4", children: ["No deliveries or pickups scheduled for ", format(selectedDate, 'dd/MM/yyyy')] }), _jsx(CreateBookingModal, { onBookingCreated: () => {
                                onCreateBooking();
                                onClose();
                            }, preselectedDate: selectedDate })] }))] }) }));
};
