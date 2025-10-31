
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState } from 'react';
import { DeleteBookingModal } from './DeleteBookingModal';
import { UndeliverableModal } from './UndeliverableModal';
import { BookingDetailsCard } from './BookingDetailsCard';
import { BookingActionButtons } from './BookingActionButtons';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Booking, BookingStatus } from './calendar/types'; // Added BookingStatus

interface BookingViewModalProps {
  booking: Booking;
  onClose: () => void;
  onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void; // Changed to BookingStatus
  onEdit: (booking: Booking) => void;
  onBookingDeleted?: () => void;
  open: boolean;
}

export const BookingViewModal = ({ 
  booking, 
  onClose, 
  onStatusUpdate, 
  onEdit, 
  onBookingDeleted, 
  open 
}: BookingViewModalProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUndeliverableModal, setShowUndeliverableModal] = useState(false);
  const { toast } = useToast();

  const handleBookingDeleted = () => {
    setShowDeleteModal(false);
    onBookingDeleted?.();
    onClose();
  };

  const handleMarkUndeliverable = async (bookingId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'undeliverable',
          delivery_failure_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Delivery Marked as Undeliverable",
        description: `Booking has been marked as undeliverable. Reason: ${reason}`,
        variant: "destructive"
      });

      // Update the booking status in the parent component
      onStatusUpdate(bookingId, 'undeliverable');
      onClose();

    } catch (error) {
      console.error('Error marking delivery as undeliverable:', error);
      toast({
        title: "Error",
        description: "Failed to mark delivery as undeliverable. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Booking Details #{booking.id.substring(0, 8)}</DialogTitle>
            <DialogDescription>
              View the details of the booking and perform actions such as updating the status, editing, or deleting the booking.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 px-6 py-4 overflow-y-auto flex-1 min-h-0">
            <BookingDetailsCard booking={booking} />

            <BookingActionButtons
              booking={booking}
              onStatusUpdate={onStatusUpdate}
              onEdit={onEdit}
              onShowDeleteModal={() => setShowDeleteModal(true)}
              onShowUndeliverableModal={() => setShowUndeliverableModal(true)}
              onClose={onClose}
            />
          </div>
        </DialogContent>
      </Dialog>

      {showDeleteModal && (
        <DeleteBookingModal
          booking={booking}
          onBookingDeleted={handleBookingDeleted}
          onClose={() => setShowDeleteModal(false)}
          open={showDeleteModal}
        />
      )}

      {showUndeliverableModal && (
        <UndeliverableModal
          booking={booking}
          onMarkUndeliverable={handleMarkUndeliverable}
          onClose={() => setShowUndeliverableModal(false)}
          open={showUndeliverableModal}
        />
      )}
    </>
  );
};
