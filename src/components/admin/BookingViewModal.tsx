
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Phone, Mail, Edit, Truck, CheckCircle, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { DeleteBookingModal } from './DeleteBookingModal';

interface BookingItem {
  equipment_name: string;
  quantity: number;
  subtotal: number;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  booking_items?: BookingItem[];
}

interface BookingViewModalProps {
  booking: Booking;
  onClose: () => void;
  onStatusUpdate: (bookingId: string, newStatus: string) => void;
  onEdit: (booking: Booking) => void;
  onBookingDeleted?: () => void;
  open: boolean;
}

export const BookingViewModal = ({ booking, onClose, onStatusUpdate, onEdit, onBookingDeleted, open }: BookingViewModalProps) => {
  const { profile } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Check if user can delete bookings
  const canDelete = profile?.role === 'SuperUser' || profile?.role === 'Admin';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

    // Add Cancel button for active bookings
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
          onClick={() => setShowDeleteModal(true)}
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
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900">{booking.customer_name}</h3>
                    <Badge className={`mt-2 ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-2xl text-gray-900">${booking.total_amount}</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{booking.customer_email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{booking.customer_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{booking.customer_address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(booking.start_date).toLocaleDateString('en-GB')} - {new Date(booking.end_date).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Equipment Items:</h4>
                    <div className="space-y-2">
                      {booking.booking_items?.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.equipment_name} × {item.quantity}</span>
                          <span>${item.subtotal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 justify-end flex-wrap">
              {getActionButtons()}
            </div>
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
