import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// import React from 'react'; // Removed this line
import { BookingSquareCard } from './BookingSquareCard';
import { Card, CardContent } from "@/components/ui/card"; // Added import
import { Calendar } from "@/components/ui/calendar"; // Added import
export const BookingsListView = ({ bookings, onStatusUpdate, onEdit, onView, searchTerm, statusFilter }) => {
    if (bookings.length === 0) {
        return (_jsx(Card, { children: _jsxs(CardContent, { className: "p-12 text-center", children: [_jsx(Calendar, { className: "h-12 w-12 text-gray-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No bookings found" }), _jsx("p", { className: "text-gray-500", children: searchTerm || statusFilter !== 'all'
                            ? 'Try adjusting your search or filter criteria.'
                            : 'Bookings will appear here when customers make reservations.' })] }) }));
    }
    return (_jsx("div", { className: "grid grid-cols-3 gap-4", children: bookings.map((booking) => (_jsx(BookingSquareCard, { booking: booking, onView: onView || (() => { }), onStatusUpdate: onStatusUpdate, onEdit: onEdit }, booking.id))) }));
};
