import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
export const CustomerInformation = ({ customerInfo, onCustomerInfoChange }) => {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Mail, { className: "h-5 w-5" }), "Contact Information"] }) }), _jsxs(CardContent, { className: "grid md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "name", children: "Full Name" }), _jsx(Input, { id: "name", value: customerInfo.name, onChange: (e) => onCustomerInfoChange('name', e.target.value), required: true })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", type: "email", value: customerInfo.email, onChange: (e) => onCustomerInfoChange('email', e.target.value), required: true })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "phone", children: "Phone Number" }), _jsx(Input, { id: "phone", type: "tel", value: customerInfo.phone, onChange: (e) => onCustomerInfoChange('phone', e.target.value), required: true })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "address", children: "Hotel/Address in Aruba" }), _jsx(Input, { id: "address", value: customerInfo.address, onChange: (e) => onCustomerInfoChange('address', e.target.value), required: true })] })] })] }));
};
