import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Added Button import
import { Edit2, CheckSquare } from 'lucide-react'; // Added icons
import { getStatusColor, getStatusLabel } from './calendar/statusUtils';
export const BookingSquareCard = ({ booking, onView, onStatusUpdate, onEdit }) => {
    // A simple example of cycling status, replace with a proper dropdown/modal later
    const handleSimpleStatusUpdate = () => {
        const statuses = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
        const currentIndex = statuses.indexOf(booking.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        onStatusUpdate(booking.id, statuses[nextIndex]);
    };
    return (_jsxs(Card, { className: "hover:shadow-md transition-shadow aspect-square flex flex-col", children: [_jsxs(CardContent, { className: "p-4 flex-grow flex flex-col justify-between cursor-pointer", onClick: () => onView(booking), children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "text-xs font-mono text-gray-500", children: ["#", booking.id.substring(0, 8)] }), _jsx("div", { className: "text-sm font-medium text-gray-900 truncate", children: booking.customer_email })] }), _jsx("div", { className: "flex justify-center", children: _jsx(Badge, { className: `text-xs ${getStatusColor(booking.status)}`, children: getStatusLabel(booking.status) }) })] }), _jsxs("div", { className: "p-2 border-t flex justify-end space-x-2 bg-slate-50", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: (e) => { e.stopPropagation(); onEdit(booking); }, title: "Edit Booking", children: _jsx(Edit2, { className: "h-4 w-4" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: (e) => { e.stopPropagation(); handleSimpleStatusUpdate(); }, title: "Update Status (Cycle)", children: _jsx(CheckSquare, { className: "h-4 w-4" }) })] })] }));
};
