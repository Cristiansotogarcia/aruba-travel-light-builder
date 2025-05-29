
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Booking } from './types';
import { getStatusColor, getStatusLabel } from './statusUtils';

interface CalendarDayViewProps {
  bookings: Booking[];
  currentDate: Date;
}

export const CalendarDayView = ({ bookings, currentDate }: CalendarDayViewProps) => {
  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      return date >= startDate && date <= endDate;
    });
  };

  const dayBookings = getBookingsForDate(currentDate);

  if (dayBookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-500">
            Bookings will appear here when customers make reservations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {dayBookings.map((booking) => (
        <Card key={booking.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">{booking.customer_name}</h3>
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
  );
};
