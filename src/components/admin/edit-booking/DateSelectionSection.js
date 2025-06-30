import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
export const DateSelectionSection = ({ startDate, endDate, onStartDateChange, onEndDateChange }) => {
    return (_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "font-medium", children: "Rental Period" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Start Date" }), _jsx(Input, { type: "date", value: startDate, onChange: (e) => onStartDateChange(e.target.value), className: "h-8" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "End Date" }), _jsx(Input, { type: "date", value: endDate, onChange: (e) => onEndDateChange(e.target.value), className: "h-8" })] })] })] }));
};
