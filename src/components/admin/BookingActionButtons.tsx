
import { Button } from '@/components/ui/button';
import { Truck, CheckCircle, Edit, X, Trash2, AlertTriangle, Undo, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Booking } from './calendar/types';

interface BookingActionButtonsProps {
  booking: Booking;
  onStatusUpdate: (bookingId: string, newStatus: string) => void;
  onEdit: (booking: Booking) => void;
  onShowDeleteModal: () => void;
  onShowUndeliverableModal: () => void;
  onClose: () => void;
}

export const BookingActionButtons = ({ 
  booking, 
  onStatusUpdate, 
  onEdit, 
  onShowDeleteModal, 
  onShowUndeliverableModal,
  onClose 
}: BookingActionButtonsProps) => {
  const { profile } = useAuth();

  // Check if user can delete bookings
  const canDelete = profile?.role === 'SuperUser' || profile?.role === 'Admin';

  const handleRescheduleDelivery = async () => {
    // When rescheduling an undeliverable booking, reset it to confirmed status
    // and clear the delivery failure reason
    await onStatusUpdate(booking.id, 'confirmed');
    onEdit(booking);
    onClose();
  };

  const getActionButtons = () => {
    const buttons = [];

    if (booking.status === 'confirmed') {
      buttons.push(
        <Button
          key="out-for-delivery"
          onClick={() => {
            onStatusUpdate(booking.id, 'out_for_delivery');
            onClose();
          }}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          <Truck className="h-4 w-4" />
          Mark Out for Delivery
        </Button>
      );
    }

    if (booking.status === 'out_for_delivery') {
      buttons.push(
        <Button
          key="delivered"
          onClick={() => {
            onStatusUpdate(booking.id, 'delivered');
            onClose();
          }}
          className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Mark Delivered
        </Button>
      );

      buttons.push(
        <Button
          key="undeliverable"
          onClick={onShowUndeliverableModal}
          className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Mark Undeliverable
        </Button>
      );
    }

    if (booking.status === 'delivered') {
      buttons.push(
        <Button
          key="undo-delivery"
          onClick={() => {
            onStatusUpdate(booking.id, 'out_for_delivery');
            onClose();
          }}
          className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
        >
          <Undo className="h-4 w-4" />
          Undo Delivery
        </Button>
      );
    }

    // Add Reschedule Delivery button for undeliverable bookings
    if (booking.status === 'undeliverable') {
      buttons.push(
        <Button
          key="reschedule"
          onClick={handleRescheduleDelivery}
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Reschedule Delivery
        </Button>
      );
    }

    // Add Edit button for all non-final statuses
    if (!['completed', 'cancelled'].includes(booking.status)) {
      buttons.push(
        <Button
          key="edit"
          onClick={() => {
            onEdit(booking);
            onClose();
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      );
    }

    // Add Cancel button for active bookings (but not undeliverable ones)
    if (['pending', 'confirmed', 'out_for_delivery', 'delivered'].includes(booking.status)) {
      buttons.push(
        <Button
          key="cancel"
          onClick={() => {
            onStatusUpdate(booking.id, 'cancelled');
            onClose();
          }}
          variant="destructive"
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Cancel Order
        </Button>
      );
    }

    // Add Delete button for Admin and SuperUser roles
    if (canDelete) {
      buttons.push(
        <Button
          key="delete"
          onClick={onShowDeleteModal}
          variant="destructive"
          className="flex items-center gap-2 bg-red-700 hover:bg-red-800"
        >
          <Trash2 className="h-4 w-4" />
          Delete Booking
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className="flex gap-2 justify-end flex-wrap">
      {getActionButtons()}
    </div>
  );
};
