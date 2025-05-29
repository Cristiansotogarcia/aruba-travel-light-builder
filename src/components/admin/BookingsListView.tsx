
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { BookingCard } from './BookingCard';

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

interface BookingsListViewProps {
  bookings: Booking[];
  onStatusUpdate: (bookingId: string, newStatus: string) => void;
  onEdit: (booking: Booking) => void;
  searchTerm: string;
  statusFilter: string;
}

export const BookingsListView = ({ 
  bookings, 
  onStatusUpdate, 
  onEdit,
  searchTerm, 
  statusFilter 
}: BookingsListViewProps) => {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Bookings will appear here when customers make reservations.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onStatusUpdate={onStatusUpdate}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};
