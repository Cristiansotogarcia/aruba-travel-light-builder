
import { BookingSquareCard } from './BookingSquareCard';
import { Booking, BookingStatus } from './calendar/types';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from 'lucide-react';

interface BookingsListViewProps {
  bookings: Booking[];
  onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void; // Changed to BookingStatus
  onEdit: (booking: Booking) => void;
  onView: (booking: Booking) => void; // Added prop (distinct from onViewBooking for now)
  searchTerm: string; // Added prop
  statusFilter: string; // Added prop (can be a more specific union type later e.g. 'all' | 'pending' etc.)
}

export const BookingsListView = ({ 
  bookings, 
  onStatusUpdate, 
  onEdit,
  onView,
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
    <div className="grid grid-cols-3 gap-4">
      {bookings.map((booking) => (
        <BookingSquareCard
          key={booking.id}
          booking={booking}
          onView={onView || (() => {})}
          onStatusUpdate={onStatusUpdate} // Pass prop
          onEdit={onEdit} // Pass prop
        />
      ))}
    </div>
  );
};
