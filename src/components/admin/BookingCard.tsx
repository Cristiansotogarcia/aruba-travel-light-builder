
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardFooter, CardHeader, CardTitle
import { Booking } from './calendar/types'; // Removed BookingItem
import { Eye, Edit, Mail, Phone, MapPin, CalendarDays, MessageSquare } from 'lucide-react'; // Added icon imports, using CalendarDays for clarity
import { getStatusColor } from './calendar/statusUtils'; // Added back getStatusColor import

interface BookingCardProps {
  booking: Booking;
  onEdit: (booking: Booking) => void;
  onView: (booking: Booking) => void;
  onStatusUpdate: (bookingId: string, status: string) => void; // Added onStatusUpdate
}

export const BookingCard = ({ booking, onStatusUpdate, onEdit, onView }: BookingCardProps) => {
  // Removed local getStatusColor function
  const renderActionButtons = () => {
    const buttons = [];

    // Add view button
    if (onView) {
      buttons.push(
        <Button
          key="view"
          onClick={() => onView(booking)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
        </Button>
      );
    }

    // Add edit button for all statuses except completed and cancelled
    if (!['completed', 'cancelled'].includes(booking.status)) {
      buttons.push(
        <Button
          key="edit"
          onClick={() => onEdit(booking)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
        </Button>
      );
    }

    // Add Reschedule button for undeliverable bookings
    if (booking.status === 'undeliverable') {
      buttons.push(
        <Button
          key="reschedule"
          onClick={() => onEdit(booking)} // Assuming reschedule also uses onEdit logic for now
          size="sm"
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          <CalendarDays className="h-4 w-4" /> {/* Changed to CalendarDays */}
          Reschedule
        </Button>
      );
    }

    if (booking.status === 'pending') {
      buttons.push(
        <Button
          key="confirm"
          onClick={() => onStatusUpdate(booking.id, 'confirmed')}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          Confirm
        </Button>
      );
    }

    if (booking.status === 'confirmed') {
      buttons.push(
        <Button
          key="out-for-delivery"
          onClick={() => onStatusUpdate(booking.id, 'out_for_delivery')}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          Mark Out for Delivery
        </Button>
      );
    }

    if (booking.status === 'out_for_delivery') {
      buttons.push(
        <Button
          key="delivered"
          onClick={() => onStatusUpdate(booking.id, 'delivered')}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700"
        >
          Mark Delivered
        </Button>
      );
    }

    if (booking.status === 'delivered') {
      buttons.push(
        <Button
          key="completed"
          onClick={() => onStatusUpdate(booking.id, 'completed')}
          size="sm"
          className="bg-gray-600 hover:bg-gray-700"
        >
          Mark Completed
        </Button>
      );
    }

    if (['pending', 'confirmed', 'out_for_delivery', 'delivered'].includes(booking.status)) {
      buttons.push(
        <Button
          key="cancel"
          onClick={() => onStatusUpdate(booking.id, 'cancelled')}
          variant="destructive"
          size="sm"
        >
          Cancel Order
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{booking.customer_name}</h3>
            <p className="text-sm text-gray-500">Booking ID: {booking.id.substring(0, 8)}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(booking.status)}>
              {booking.status === 'undeliverable' ? 'Undeliverable' : booking.status}
            </Badge>
            <span className="font-bold text-xl text-gray-900">${booking.total_amount.toFixed(2)}</span>
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
            {booking.customer_comment && (
              <div className="flex items-start gap-2 text-gray-600">
                <MessageSquare className="h-4 w-4 mt-1" />
                <span className="whitespace-pre-wrap">{booking.customer_comment}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarDays className="h-4 w-4" /> {/* Changed to CalendarDays */}
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
                  <span>${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          {renderActionButtons()}
        </div>
      </CardContent>
    </Card>
  );
};
