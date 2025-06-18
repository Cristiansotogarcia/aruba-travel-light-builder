
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Truck, Package } from 'lucide-react';
import { format } from 'date-fns';
import { Booking } from '@/components/admin/calendar/types';
import { getStatusColor, getStatusLabel } from './statusUtils';
import { getBookingsByTypeForDate } from './bookingUtils';

interface CalendarDayViewProps {
  bookings: Booking[];
  currentDate: Date;
}

export const CalendarDayView = ({ bookings, currentDate }: CalendarDayViewProps) => {
  const { deliveries, pickups } = getBookingsByTypeForDate(bookings, currentDate);

  if (deliveries.length === 0 && pickups.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries or pickups</h3>
          <p className="text-gray-500">
            No equipment deliveries or pickups scheduled for {format(currentDate, 'dd/MM/yyyy')}.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderBookingSection = (bookings: Booking[], title: string, icon: React.ReactNode, bgColor: string) => {
    if (bookings.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className={`flex items-center gap-2 p-3 rounded-lg ${bgColor}`}>
          {icon}
          <h3 className="font-semibold text-lg">{title} ({bookings.length})</h3>
        </div>
        
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{booking.customer_name}</h4>
                    <p className="text-sm text-gray-500">
                      {format(new Date(booking.start_date), 'dd/MM/yyyy')} - {format(new Date(booking.end_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">${booking.total_amount}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`mt-2 ${getStatusColor(booking.status)}`}
                      onClick={() => {
                        console.log('Status change for booking:', booking.id);
                      }}
                    >
                      {getStatusLabel(booking.status)}
                    </Button>
                  </div>
                </div>
                
                {booking.booking_items && booking.booking_items.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Equipment:</p>
                    <div className="flex flex-wrap gap-2">
                      {booking.booking_items.map((item, index) => (
                        <Badge key={index} variant="secondary">
                          {item.equipment_name} × {item.quantity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {renderBookingSection(
        deliveries, 
        "Deliveries", 
        <Truck className="h-5 w-5 text-green-600" />,
        "bg-green-50 border border-green-200"
      )}
      
      {renderBookingSection(
        pickups, 
        "Pickups", 
        <Package className="h-5 w-5 text-orange-600" />,
        "bg-orange-50 border border-orange-200"
      )}
    </div>
  );
};
