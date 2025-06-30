import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
export const TempPasswordDialog = ({ open, onClose, result }) => {
    const { toast } = useToast();
    const copyTempPassword = () => {
        if (result?.tempPassword) {
            navigator.clipboard.writeText(result.tempPassword);
            toast({
                title: "Copied",
                description: "Temporary password copied to clipboard",
            });
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "User Created Successfully" }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: [_jsxs("p", { className: "text-sm text-green-700 mb-2", children: ["User ", _jsx("strong", { children: result?.user.name }), " has been created successfully."] }), _jsx("p", { className: "text-sm text-green-700", children: "Please share the following temporary password with the user. It will expire in 48 hours." })] }), _jsxs("div", { className: "bg-gray-50 border rounded-lg p-4", children: [_jsx(Label, { className: "text-sm font-medium text-gray-700", children: "Temporary Password (OTP)" }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx(Input, { value: result?.tempPassword || '', readOnly: true, className: "font-mono text-lg" }), _jsx(Button, { variant: "outline", size: "sm", onClick: copyTempPassword, children: _jsx(Copy, { className: "h-4 w-4" }) })] })] }), _jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: _jsxs("p", { className: "text-sm text-blue-700", children: [_jsx("strong", { children: "Important:" }), " The user must change this temporary password on their first login. The temporary password will expire in 48 hours."] }) }), _jsx(Button, { onClick: onClose, className: "w-full", children: "Close" })] })] }) }));
};
