import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
export const BookingSummarySection = ({ startDate, endDate, bookingItems, discount, loading, isUndeliverable, onDiscountChange, onSubmit, onCancel }) => {
    const calculateSubtotal = () => {
        return bookingItems.reduce((total, item) => total + item.subtotal, 0);
    };
    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        return subtotal - discount;
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "discount", className: "text-xs", children: "Discount ($)" }), _jsx(Input, { id: "discount", type: "number", min: "0", max: calculateSubtotal(), value: discount, onChange: (e) => onDiscountChange(Math.max(0, Math.min(calculateSubtotal(), Number(e.target.value)))), className: "h-8" })] }), startDate && endDate && bookingItems.length > 0 && (_jsxs("div", { className: "space-y-1 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Subtotal:" }), _jsxs("span", { children: ["$", calculateSubtotal().toFixed(2)] })] }), discount > 0 && (_jsxs("div", { className: "flex justify-between text-red-600", children: [_jsx("span", { children: "Discount:" }), _jsxs("span", { children: ["-$", discount.toFixed(2)] })] })), _jsxs("div", { className: "flex justify-between font-bold border-t pt-1", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { children: ["$", calculateTotal().toFixed(2)] })] })] })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", onClick: onCancel, className: "flex-1", children: "Cancel" }), _jsx(Button, { onClick: onSubmit, disabled: loading, className: "flex-1", children: loading ? 'Updating...' : (isUndeliverable ? 'Reschedule' : 'Update') })] })] }));
};
