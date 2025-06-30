import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
const FAILURE_REASONS = [
    'missed flight',
    'no answer at door',
    'order was cancelled',
    'wrong delivery date',
    'customer unreachable',
    'address not found'
];
export const UndeliverableModal = ({ open, onClose, booking, onMarkUndeliverable }) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async () => {
        const reason = selectedReason === 'other' ? customReason.trim() : selectedReason;
        if (!reason) {
            return;
        }
        setLoading(true);
        try {
            await onMarkUndeliverable(booking.id, reason);
            handleClose();
        }
        finally {
            setLoading(false);
        }
    };
    const handleClose = () => {
        setSelectedReason('');
        setCustomReason('');
        setLoading(false);
        onClose();
    };
    const isValid = selectedReason && (selectedReason !== 'other' || customReason.trim());
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "h-5 w-5 text-orange-500" }), "Mark as Undeliverable"] }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "bg-orange-50 border border-orange-200 rounded-lg p-3", children: [_jsxs("p", { className: "text-sm text-orange-800", children: [_jsx("strong", { children: "Customer:" }), " ", booking.customer_name] }), _jsxs("p", { className: "text-sm text-orange-800", children: [_jsx("strong", { children: "Booking ID:" }), " #", booking.id.substring(0, 8)] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "failure-reason", children: "Reason for delivery failure *" }), _jsxs(Select, { value: selectedReason, onValueChange: setSelectedReason, children: [_jsx(SelectTrigger, { className: "mt-1", children: _jsx(SelectValue, { placeholder: "Select a reason" }) }), _jsxs(SelectContent, { children: [FAILURE_REASONS.map((reason) => (_jsx(SelectItem, { value: reason, children: reason.charAt(0).toUpperCase() + reason.slice(1) }, reason))), _jsx(SelectItem, { value: "other", children: "Other (specify below)" })] })] })] }), selectedReason === 'other' && (_jsxs("div", { children: [_jsx(Label, { htmlFor: "custom-reason", children: "Custom reason *" }), _jsx(Textarea, { id: "custom-reason", value: customReason, onChange: (e) => setCustomReason(e.target.value), placeholder: "Please describe the reason...", className: "mt-1", rows: 3 })] })), _jsxs("div", { className: "flex gap-2 pt-4", children: [_jsx(Button, { onClick: handleSubmit, disabled: !isValid || loading, className: "flex-1 bg-orange-600 hover:bg-orange-700", children: loading ? 'Processing...' : 'Mark Undeliverable' }), _jsx(Button, { variant: "outline", onClick: handleClose, className: "flex-1", children: "Cancel" })] })] })] }) }));
};
