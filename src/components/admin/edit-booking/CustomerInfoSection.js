import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
export const CustomerInfoSection = ({ customerInfo, onCustomerInfoChange }) => {
    const updateCustomerInfo = (field, value) => {
        onCustomerInfoChange({
            ...customerInfo,
            [field]: value
        });
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "font-medium", children: "Customer Information" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "name", className: "text-xs", children: "Name" }), _jsx(Input, { id: "name", value: customerInfo.name, onChange: (e) => updateCustomerInfo('name', e.target.value), className: "h-8" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "email", className: "text-xs", children: "Email" }), _jsx(Input, { id: "email", type: "email", value: customerInfo.email, onChange: (e) => updateCustomerInfo('email', e.target.value), className: "h-8" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "phone", className: "text-xs", children: "Phone" }), _jsx(Input, { id: "phone", value: customerInfo.phone, onChange: (e) => updateCustomerInfo('phone', e.target.value), className: "h-8" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "address", className: "text-xs", children: "Address" }), _jsx(Input, { id: "address", value: customerInfo.address, onChange: (e) => updateCustomerInfo('address', e.target.value), className: "h-8" })] })] })] }));
};
