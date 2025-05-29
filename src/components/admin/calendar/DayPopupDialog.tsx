
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { CreateBookingModal } from '../CreateBookingModal';
import { Booking } from './types';
import { getStatusColor, getStatusLabel } from './statusUtils';

interface DayPopupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  bookings: Booking[];
  onCreateBooking: () => void;
  onViewBooking: (booking: Booking) => void;
}

export const DayPopupDialog = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  bookings, 
  onCreateBooking,
  onViewBooking 
}: DayPopupDialogProps) => {
  if (!selectedDate) return null;

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      return date >= startDate && date <= endDate;
    });
  };
  
  const dayBookings = getBookingsForDate(selectedDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Bookings for {format(selectedDate, 'EEEE, dd/MM/yyyy')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {dayBookings.length > 0 ? (
            dayBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{booking.customer_name}</h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(booking.start_date), 'dd/MM/yyyy')} - {format(new Date(booking.end_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="font-bold">${booking.total_amount}</div>
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewBooking(booking)}
                      >
                        <Eye className="h-4 w-4" />
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
            ))
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings for this day</h3>
              <p className="text-gray-500 mb-4">
                Would you like to create a new booking for {format(selectedDate, 'dd/MM/yyyy')}?
              </p>
              <CreateBookingModal 
                onBookingCreated={() => {
                  onCreateBooking();
                  onClose();
                }}
                preselectedDate={selectedDate}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
