import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@/components/ui/button';
import { Truck, CheckCircle, Edit, X, Trash2, AlertTriangle, Undo, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
export const BookingActionButtons = ({ booking, onStatusUpdate, onEdit, onShowDeleteModal, onShowUndeliverableModal, onClose }) => {
    const { profile } = useAuth();
    // Check if user can delete bookings
    const canDelete = profile?.role === 'SuperUser' || profile?.role === 'Admin';
    const handleRescheduleDelivery = () => {
        // Open the edit modal - the CompactEditBookingModal will handle status changes
        onEdit(booking);
        onClose();
    };
    const getActionButtons = () => {
        const buttons = [];
        if (booking.status === 'confirmed') {
            buttons.push(_jsxs(Button, { onClick: () => {
                    onStatusUpdate(booking.id, 'out_for_delivery');
                    onClose();
                }, className: "bg-blue-600 hover:bg-blue-700 flex items-center gap-2", children: [_jsx(Truck, { className: "h-4 w-4" }), "Mark Out for Delivery"] }, "out-for-delivery"));
        }
        if (booking.status === 'out_for_delivery') {
            buttons.push(_jsxs(Button, { onClick: () => {
                    onStatusUpdate(booking.id, 'delivered');
                    onClose();
                }, className: "bg-purple-600 hover:bg-purple-700 flex items-center gap-2", children: [_jsx(CheckCircle, { className: "h-4 w-4" }), "Mark Delivered"] }, "delivered"));
            buttons.push(_jsxs(Button, { onClick: onShowUndeliverableModal, className: "bg-orange-600 hover:bg-orange-700 flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), "Mark Undeliverable"] }, "undeliverable"));
        }
        if (booking.status === 'delivered') {
            buttons.push(_jsxs(Button, { onClick: () => {
                    onStatusUpdate(booking.id, 'out_for_delivery');
                    onClose();
                }, className: "bg-amber-600 hover:bg-amber-700 flex items-center gap-2", children: [_jsx(Undo, { className: "h-4 w-4" }), "Undo Delivery"] }, "undo-delivery"));
        }
        // Add Reschedule Delivery button for undeliverable bookings
        if (booking.status === 'undeliverable') {
            buttons.push(_jsxs(Button, { onClick: handleRescheduleDelivery, className: "bg-green-600 hover:bg-green-700 flex items-center gap-2", children: [_jsx(Calendar, { className: "h-4 w-4" }), "Reschedule Delivery"] }, "reschedule"));
        }
        // Add Edit button for all non-final statuses
        if (!['completed', 'cancelled'].includes(booking.status)) {
            buttons.push(_jsxs(Button, { onClick: () => {
                    onEdit(booking);
                    onClose();
                }, variant: "outline", className: "flex items-center gap-2", children: [_jsx(Edit, { className: "h-4 w-4" }), "Edit"] }, "edit"));
        }
        // Add Cancel button for active bookings (but not undeliverable ones)
        if (['pending', 'confirmed', 'out_for_delivery', 'delivered'].includes(booking.status)) {
            buttons.push(_jsxs(Button, { onClick: () => {
                    onStatusUpdate(booking.id, 'cancelled');
                    onClose();
                }, variant: "destructive", className: "flex items-center gap-2", children: [_jsx(X, { className: "h-4 w-4" }), "Cancel Order"] }, "cancel"));
        }
        // Add Delete button for Admin and SuperUser roles
        if (canDelete) {
            buttons.push(_jsxs(Button, { onClick: onShowDeleteModal, variant: "destructive", className: "flex items-center gap-2 bg-red-700 hover:bg-red-800", children: [_jsx(Trash2, { className: "h-4 w-4" }), "Delete Booking"] }, "delete"));
        }
        return buttons;
    };
    return (_jsx("div", { className: "flex gap-2 justify-end flex-wrap", children: getActionButtons() }));
};
