
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { DeleteBookingModal } from './DeleteBookingModal';
import { BookingDetailsCard } from './BookingDetailsCard';
import { BookingActionButtons } from './BookingActionButtons';
import { Booking } from './calendar/types';

interface BookingViewModalProps {
  booking: Booking;
  onClose: () => void;
  onStatusUpdate: (bookingId: string, newStatus: string) => void;
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

  const handleBookingDeleted = () => {
    setShowDeleteModal(false);
    onBookingDeleted?.();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details #{booking.id.substring(0, 8)}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <BookingDetailsCard booking={booking} />

            <BookingActionButtons
              booking={booking}
              onStatusUpdate={onStatusUpdate}
              onEdit={onEdit}
              onShowDeleteModal={() => setShowDeleteModal(true)}
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
    </>
  );
};
