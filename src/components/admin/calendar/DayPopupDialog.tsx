
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Eye, Truck, Package } from 'lucide-react';
import { format } from 'date-fns';
import { CreateBookingModal } from '../CreateBookingModal';
import { Booking } from '@/components/admin/calendar/types';
import { getStatusColor } from './statusUtils';
import { getBookingsByTypeForDate } from './bookingUtils';

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

  const { deliveries, pickups } = getBookingsByTypeForDate(bookings, selectedDate);
  const totalCount = deliveries.length + pickups.length;

  const handleViewBooking = (booking: Booking) => {
    onViewBooking(booking);
    onClose(); // Auto-close the day popup for cleaner flow
  };

  const getDeliveryStatusLabel = (status: string) => {
    switch (status) {
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Scheduled';
    }
  };

  const getPickupStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Picked Up';
      default:
        return 'Scheduled';
    }
  };

  const renderBookingSection = (sectionBookings: Booking[], emptyMessage: string, isDelivery: boolean = true) => {
    if (sectionBookings.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500 text-sm">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {sectionBookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold">{booking.customer_name}</h4>
                  <p className="text-sm text-gray-500">
                    {format(new Date(booking.start_date), 'dd/MM/yyyy')} - {format(new Date(booking.end_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className="font-bold">${booking.total_amount}</div>
                    <Badge className={getStatusColor(booking.status)}>
                      {isDelivery ? getDeliveryStatusLabel(booking.status) : getPickupStatusLabel(booking.status)}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewBooking(booking)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Equipment Schedule for {format(selectedDate, 'EEEE, dd/MM/yyyy')}
          </DialogTitle>
          <DialogDescription>
            This dialog shows all the deliveries and pickups scheduled for the selected date.
          </DialogDescription>
        </DialogHeader>
        
        {totalCount > 0 ? (
          <div className="space-y-6">
            {/* Deliveries Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Truck className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg text-green-800">
                  Deliveries ({deliveries.length})
                </h3>
              </div>
              {renderBookingSection(
                deliveries, 
                "No deliveries scheduled for this day",
                true
              )}
            </div>

            {/* Pickups Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <Package className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-lg text-orange-800">
                  Pickups ({pickups.length})
                </h3>
              </div>
              {renderBookingSection(
                pickups, 
                "No pickups scheduled for this day",
                false
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No equipment activities</h3>
            <p className="text-gray-500 mb-4">
              No deliveries or pickups scheduled for {format(selectedDate, 'dd/MM/yyyy')}
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
      </DialogContent>
    </Dialog>
  );
};
