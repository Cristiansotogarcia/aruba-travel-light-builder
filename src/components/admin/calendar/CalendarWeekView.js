import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Truck, Package } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { getTotalCountsForDate } from './bookingUtils';
export const CalendarWeekView = ({ bookings, currentDate, onDayClick }) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "grid grid-cols-7 gap-2", children: weekDays.map((day) => {
                    const { deliveryCount, pickupCount, totalCount } = getTotalCountsForDate(bookings, day);
                    const isToday = isSameDay(day, new Date());
                    return (_jsx(Card, { className: `min-h-32 cursor-pointer hover:shadow-md transition-shadow ${isToday ? 'ring-2 ring-blue-500' : ''} ${totalCount > 0 ? 'hover:bg-blue-50' : ''}`, onClick: () => totalCount > 0 && onDayClick(day), children: _jsxs(CardContent, { className: "p-2", children: [_jsxs("div", { className: "text-center mb-2", children: [_jsx("div", { className: "text-xs text-gray-500", children: format(day, 'EEE') }), _jsx("div", { className: `text-sm font-medium ${isToday ? 'text-blue-600' : ''}`, children: format(day, 'd') })] }), _jsxs("div", { className: "space-y-1", children: [deliveryCount > 0 && (_jsxs(Badge, { variant: "secondary", className: "w-full text-xs flex items-center justify-center gap-1 bg-green-100 text-green-800", children: [_jsx(Truck, { className: "h-3 w-3" }), deliveryCount, " delivery", deliveryCount > 1 ? 's' : ''] })), pickupCount > 0 && (_jsxs(Badge, { variant: "secondary", className: "w-full text-xs flex items-center justify-center gap-1 bg-orange-100 text-orange-800", children: [_jsx(Package, { className: "h-3 w-3" }), pickupCount, " pickup", pickupCount > 1 ? 's' : ''] }))] })] }) }, day.toISOString()));
                }) }), weekDays.every(day => getTotalCountsForDate(bookings, day).totalCount === 0) && (_jsxs("div", { className: "text-center py-8", children: [_jsx(Calendar, { className: "h-12 w-12 text-gray-400 mx-auto mb-4" }), _jsx("p", { className: "text-gray-500", children: "No deliveries or pickups scheduled for this week" })] }))] }));
};
