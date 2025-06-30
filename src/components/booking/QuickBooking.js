import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
// interface QuickBookingProps { // Removed unused interface
//   // equipmentId?: string; // Removed unused prop
// }
export const QuickBooking = ( /*{ equipmentId }: QuickBookingProps*/) => {
    const [selectedDates, setSelectedDates] = useState({
        startDate: '',
        endDate: ''
    });
    const today = new Date().toISOString().split('T')[0];
    const calculateDays = () => {
        if (!selectedDates.startDate || !selectedDates.endDate)
            return 0;
        const start = new Date(selectedDates.startDate);
        const end = new Date(selectedDates.endDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };
    return (_jsxs(Card, { className: "sticky top-4", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-5 w-5" }), "Quick Booking"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Start Date" }), _jsx("input", { type: "date", value: selectedDates.startDate, onChange: (e) => setSelectedDates(prev => ({ ...prev, startDate: e.target.value })), min: today, className: "w-full px-3 py-2 border border-gray-300 rounded-md" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "End Date" }), _jsx("input", { type: "date", value: selectedDates.endDate, onChange: (e) => setSelectedDates(prev => ({ ...prev, endDate: e.target.value })), min: selectedDates.startDate || today, className: "w-full px-3 py-2 border border-gray-300 rounded-md" })] })] }), selectedDates.startDate && selectedDates.endDate && (_jsx("div", { className: "p-3 bg-gray-50 rounded-md", children: _jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-600", children: [_jsx(Clock, { className: "h-4 w-4" }), _jsxs("span", { children: [calculateDays(), " days rental"] })] }) })), _jsxs("div", { className: "space-y-2", children: [_jsx(Badge, { variant: "outline", className: "w-full justify-center py-2", children: "Free Delivery & Pickup" }), _jsx(Badge, { variant: "outline", className: "w-full justify-center py-2", children: "24/7 Support" })] }), _jsx(Link, { to: "/book", className: "w-full", children: _jsx(Button, { className: "w-full", size: "lg", children: "Continue Booking" }) }), _jsx("div", { className: "text-center", children: _jsxs("p", { className: "text-sm text-gray-500", children: ["Need help? Call us at", ' ', _jsx("a", { href: "tel:+297-123-4567", className: "text-primary hover:underline", children: "+297 123-4567" })] }) })] })] }));
};
