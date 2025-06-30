import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
export const DateSelection = ({ startDate, endDate, onStartDateChange, onEndDateChange }) => {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-5 w-5" }), "Rental Period"] }) }), _jsxs(CardContent, { className: "grid md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "startDate", children: "Start Date" }), _jsx(Input, { id: "startDate", type: "date", value: startDate, onChange: (e) => onStartDateChange(e.target.value), min: new Date().toISOString().split('T')[0], required: true })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "endDate", children: "End Date" }), _jsx(Input, { id: "endDate", type: "date", value: endDate, onChange: (e) => onEndDateChange(e.target.value), min: startDate || new Date().toISOString().split('T')[0], required: true })] })] })] }));
};
