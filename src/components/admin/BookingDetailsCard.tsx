
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, User, Phone, MapPin, Package, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusColor } from './calendar/statusUtils';
import { Booking } from './calendar/types';

interface BookingDetailsCardProps {
  booking: Booking;
}

export const BookingDetailsCard = ({ booking }: BookingDetailsCardProps) => {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Status and Dates */}
        <div className="flex justify-between items-start">
          <div>
            <Badge className={getStatusColor(booking.status)}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('_', ' ')}
            </Badge>
            <div className="flex items-center gap-2 mt-3 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(booking.start_date), 'dd/MM/yyyy')} - {format(new Date(booking.end_date), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${booking.total_amount}</div>
            <div className="text-sm text-gray-500">Total Amount</div>
          </div>
        </div>

        {/* Delivery Failure Alert - Only show for undeliverable bookings */}
        {booking.status === 'undeliverable' && booking.delivery_failure_reason && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Delivery Failed:</strong> {booking.delivery_failure_reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Customer Information */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>
              <div className="font-medium">{booking.customer_name}</div>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>
              <div className="font-medium">{booking.customer_email}</div>
            </div>
            <div>
              <span className="text-gray-500 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Phone:
              </span>
              <div className="font-medium">{booking.customer_phone}</div>
            </div>
            <div>
              <span className="text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Accommodation:
              </span>
              <div className="font-medium">{booking.customer_address}</div>
            </div>
            {booking.room_number && (
              <div>
                <span className="text-gray-500">Room Number:</span>
                <div className="font-medium">{booking.room_number}</div>
              </div>
            )}
          </div>
        </div>
        {booking.customer_comment && (
          <div className="mt-4">
            <h3 className="font-semibold mb-1">Customer Comments</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.customer_comment}</p>
          </div>
        )}

        {/* Equipment Items */}
        {booking.booking_items && booking.booking_items.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipment Items
            </h3>
            <div className="space-y-2">
              {booking.booking_items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{item.equipment_name}</div>
                    <div className="text-sm text-gray-500">
                      ${item.equipment_price}/day × {item.quantity} items
                    </div>
                  </div>
                  <div className="font-bold">${item.subtotal}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
