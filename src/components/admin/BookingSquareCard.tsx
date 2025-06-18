
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Added Button import
import { Edit2, CheckSquare } from 'lucide-react'; // Added icons
import { getStatusColor, getStatusLabel } from './calendar/statusUtils';
import { Booking, BookingStatus } from './calendar/types';

interface BookingSquareCardProps {
  booking: Booking;
  onView: (booking: Booking) => void;
  onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void; // Added prop
  onEdit: (booking: Booking) => void; // Added prop
}

export const BookingSquareCard = ({ booking, onView, onStatusUpdate, onEdit }: BookingSquareCardProps) => {
  // A simple example of cycling status, replace with a proper dropdown/modal later
  const handleSimpleStatusUpdate = () => {
    const statuses: BookingStatus[] = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
    const currentIndex = statuses.indexOf(booking.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    onStatusUpdate(booking.id, statuses[nextIndex]);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow aspect-square flex flex-col"
    >
      <CardContent 
        className="p-4 flex-grow flex flex-col justify-between cursor-pointer" 
        onClick={() => onView(booking)}
      >
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
      <div className="p-2 border-t flex justify-end space-x-2 bg-slate-50">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(booking); }} title="Edit Booking">
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSimpleStatusUpdate(); }} title="Update Status (Cycle)">
          <CheckSquare className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
