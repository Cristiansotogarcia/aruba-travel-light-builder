import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export const BookingSummary = ({ days, itemsCount, total }) => {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Booking Summary" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Rental Period:" }), _jsxs("span", { children: [days, " days"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Equipment Items:" }), _jsx("span", { children: itemsCount })] }), _jsx("div", { className: "border-t pt-2", children: _jsxs("div", { className: "flex justify-between font-bold text-lg", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { children: ["$", total] })] }) })] }) })] }));
};
