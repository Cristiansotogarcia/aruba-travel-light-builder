
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, getStatusLabel } from './calendar/statusUtils';

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

interface BookingSquareCardProps {
  booking: Booking;
  onView: (booking: Booking) => void;
}

export const BookingSquareCard = ({ booking, onView }: BookingSquareCardProps) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow aspect-square"
      onClick={() => onView(booking)}
    >
      <CardContent className="p-4 h-full flex flex-col justify-between">
        <div className="space-y-2">
          <div className="text-xs font-mono text-gray-500">
            #{booking.id.substring(0, 8)}
          </div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {booking.customer_email}
          </div>
        </div>
        <div className="flex justify-center">
          <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
            {getStatusLabel(booking.status)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
