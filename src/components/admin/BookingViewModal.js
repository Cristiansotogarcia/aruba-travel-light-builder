import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { DeleteBookingModal } from './DeleteBookingModal';
import { UndeliverableModal } from './UndeliverableModal';
import { BookingDetailsCard } from './BookingDetailsCard';
import { BookingActionButtons } from './BookingActionButtons';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
export const BookingViewModal = ({ booking, onClose, onStatusUpdate, onEdit, onBookingDeleted, open }) => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showUndeliverableModal, setShowUndeliverableModal] = useState(false);
    const { toast } = useToast();
    const handleBookingDeleted = () => {
        setShowDeleteModal(false);
        onBookingDeleted?.();
        onClose();
    };
    const handleMarkUndeliverable = async (bookingId, reason) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({
                status: 'undeliverable',
                delivery_failure_reason: reason,
                updated_at: new Date().toISOString()
            })
                .eq('id', bookingId);
            if (error)
                throw error;
            toast({
                title: "Delivery Marked as Undeliverable",
                description: `Booking has been marked as undeliverable. Reason: ${reason}`,
                variant: "destructive"
            });
            // Update the booking status in the parent component
            onStatusUpdate(bookingId, 'undeliverable');
            onClose();
        }
        catch (error) {
            console.error('Error marking delivery as undeliverable:', error);
            toast({
                title: "Error",
                description: "Failed to mark delivery as undeliverable. Please try again.",
                variant: "destructive"
            });
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Booking Details #", booking.id.substring(0, 8)] }) }), _jsxs("div", { className: "space-y-6", children: [_jsx(BookingDetailsCard, { booking: booking }), _jsx(BookingActionButtons, { booking: booking, onStatusUpdate: onStatusUpdate, onEdit: onEdit, onShowDeleteModal: () => setShowDeleteModal(true), onShowUndeliverableModal: () => setShowUndeliverableModal(true), onClose: onClose })] })] }) }), showDeleteModal && (_jsx(DeleteBookingModal, { booking: booking, onBookingDeleted: handleBookingDeleted, onClose: () => setShowDeleteModal(false), open: showDeleteModal })), showUndeliverableModal && (_jsx(UndeliverableModal, { booking: booking, onMarkUndeliverable: handleMarkUndeliverable, onClose: () => setShowUndeliverableModal(false), open: showUndeliverableModal }))] }));
};
