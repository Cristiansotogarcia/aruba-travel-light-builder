import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Truck, Package } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusColor, getStatusLabel } from './statusUtils';
import { getBookingsByTypeForDate } from './bookingUtils';
export const CalendarDayView = ({ bookings, currentDate }) => {
    const { deliveries, pickups } = getBookingsByTypeForDate(bookings, currentDate);
    if (deliveries.length === 0 && pickups.length === 0) {
        return (_jsx(Card, { children: _jsxs(CardContent, { className: "p-12 text-center", children: [_jsx(Calendar, { className: "h-12 w-12 text-gray-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No deliveries or pickups" }), _jsxs("p", { className: "text-gray-500", children: ["No equipment deliveries or pickups scheduled for ", format(currentDate, 'dd/MM/yyyy'), "."] })] }) }));
    }
    const renderBookingSection = (bookings, title, icon, bgColor) => {
        if (bookings.length === 0)
            return null;
        return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: `flex items-center gap-2 p-3 rounded-lg ${bgColor}`, children: [icon, _jsxs("h3", { className: "font-semibold text-lg", children: [title, " (", bookings.length, ")"] })] }), _jsx("div", { className: "grid gap-4", children: bookings.map((booking) => (_jsx(Card, { className: "hover:shadow-md transition-shadow", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold", children: booking.customer_name }), _jsxs("p", { className: "text-sm text-gray-500", children: [format(new Date(booking.start_date), 'dd/MM/yyyy'), " - ", format(new Date(booking.end_date), 'dd/MM/yyyy')] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "text-lg font-bold", children: ["$", booking.total_amount] }), _jsx(Button, { variant: "outline", size: "sm", className: `mt-2 ${getStatusColor(booking.status)}`, onClick: () => {
                                                        console.log('Status change for booking:', booking.id);
                                                    }, children: getStatusLabel(booking.status) })] })] }), booking.booking_items && booking.booking_items.length > 0 && (_jsxs("div", { className: "border-t pt-3", children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "Equipment:" }), _jsx("div", { className: "flex flex-wrap gap-2", children: booking.booking_items.map((item, index) => (_jsxs(Badge, { variant: "secondary", children: [item.equipment_name, " \u00D7 ", item.quantity] }, index))) })] }))] }) }, booking.id))) })] }));
    };
    return (_jsxs("div", { className: "space-y-8", children: [renderBookingSection(deliveries, "Deliveries", _jsx(Truck, { className: "h-5 w-5 text-green-600" }), "bg-green-50 border border-green-200"), renderBookingSection(pickups, "Pickups", _jsx(Package, { className: "h-5 w-5 text-orange-600" }), "bg-orange-50 border border-orange-200")] }));
};
