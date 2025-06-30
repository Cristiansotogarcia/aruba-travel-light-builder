import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardFooter, CardHeader, CardTitle
import { Eye, Edit, Mail, Phone, MapPin, CalendarDays } from 'lucide-react'; // Added icon imports, using CalendarDays for clarity
import { getStatusColor } from './calendar/statusUtils'; // Added back getStatusColor import
export const BookingCard = ({ booking, onStatusUpdate, onEdit, onView }) => {
    // Removed local getStatusColor function
    const renderActionButtons = () => {
        const buttons = [];
        // Add view button
        if (onView) {
            buttons.push(_jsx(Button, { onClick: () => onView(booking), variant: "outline", size: "sm", className: "flex items-center gap-2", children: _jsx(Eye, { className: "h-4 w-4" }) }, "view"));
        }
        // Add edit button for all statuses except completed and cancelled
        if (!['completed', 'cancelled'].includes(booking.status)) {
            buttons.push(_jsx(Button, { onClick: () => onEdit(booking), variant: "outline", size: "sm", className: "flex items-center gap-2", children: _jsx(Edit, { className: "h-4 w-4" }) }, "edit"));
        }
        // Add Reschedule button for undeliverable bookings
        if (booking.status === 'undeliverable') {
            buttons.push(_jsxs(Button, { onClick: () => onEdit(booking), size: "sm", className: "bg-green-600 hover:bg-green-700 flex items-center gap-2", children: [_jsx(CalendarDays, { className: "h-4 w-4" }), " ", "Reschedule"] }, "reschedule"));
        }
        if (booking.status === 'pending') {
            buttons.push(_jsx(Button, { onClick: () => onStatusUpdate(booking.id, 'confirmed'), size: "sm", className: "bg-green-600 hover:bg-green-700", children: "Confirm" }, "confirm"));
        }
        if (booking.status === 'confirmed') {
            buttons.push(_jsx(Button, { onClick: () => onStatusUpdate(booking.id, 'out_for_delivery'), size: "sm", className: "bg-blue-600 hover:bg-blue-700", children: "Mark Out for Delivery" }, "out-for-delivery"));
        }
        if (booking.status === 'out_for_delivery') {
            buttons.push(_jsx(Button, { onClick: () => onStatusUpdate(booking.id, 'delivered'), size: "sm", className: "bg-purple-600 hover:bg-purple-700", children: "Mark Delivered" }, "delivered"));
        }
        if (booking.status === 'delivered') {
            buttons.push(_jsx(Button, { onClick: () => onStatusUpdate(booking.id, 'completed'), size: "sm", className: "bg-gray-600 hover:bg-gray-700", children: "Mark Completed" }, "completed"));
        }
        if (['pending', 'confirmed', 'out_for_delivery', 'delivered'].includes(booking.status)) {
            buttons.push(_jsx(Button, { onClick: () => onStatusUpdate(booking.id, 'cancelled'), variant: "destructive", size: "sm", children: "Cancel Order" }, "cancel"));
        }
        return buttons;
    };
    return (_jsx(Card, { children: _jsxs(CardContent, { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-lg text-gray-900", children: booking.customer_name }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Booking ID: ", booking.id.substring(0, 8)] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Badge, { className: getStatusColor(booking.status), children: booking.status === 'undeliverable' ? 'Undeliverable' : booking.status }), _jsxs("span", { className: "font-bold text-xl text-gray-900", children: ["$", booking.total_amount] })] })] }), _jsxs("div", { className: "grid md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-600", children: [_jsx(Mail, { className: "h-4 w-4" }), _jsx("span", { children: booking.customer_email })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-600", children: [_jsx(Phone, { className: "h-4 w-4" }), _jsx("span", { children: booking.customer_phone })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-600", children: [_jsx(MapPin, { className: "h-4 w-4" }), _jsx("span", { children: booking.customer_address })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-600", children: [_jsx(CalendarDays, { className: "h-4 w-4" }), " ", _jsxs("span", { children: [new Date(booking.start_date).toLocaleDateString('en-GB'), " - ", new Date(booking.end_date).toLocaleDateString('en-GB')] })] })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium text-gray-900 mb-2", children: "Equipment Items:" }), _jsx("div", { className: "space-y-2", children: booking.booking_items?.map((item, index) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { children: [item.equipment_name, " \u00D7 ", item.quantity] }), _jsxs("span", { children: ["$", item.subtotal] })] }, index))) })] })] }), _jsx("div", { className: "flex gap-2 mt-6 pt-4 border-t", children: renderActionButtons() })] }) }));
};
