import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar, Eye } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { CreateBookingModal } from './CreateBookingModal';
import { BookingViewModal } from './BookingViewModal';

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
  booking_items?: Array<{
    equipment_name: string;
    quantity: number;
  }>;
}

interface BookingCalendarViewProps {
  bookings: Booking[];
  viewMode: 'day' | 'week';
  onStatusUpdate: (bookingId: string, newStatus: string) => void;
  onCreateBooking: () => void;
}

export const BookingCalendarView = ({ bookings, viewMode, onStatusUpdate, onCreateBooking }: BookingCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : addDays(prev, -1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    }
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      return date >= startDate && date <= endDate;
    });
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowDayPopup(true);
  };

  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              {format(currentDate, 'EEEE, dd/MM/yyyy')}
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Return to today
          </Button>
        </div>

        <div className="grid gap-4">
          {dayBookings.length > 0 ? (
            dayBookings.map((booking) => (
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
                          // This will be implemented later for status changes
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
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-500">
                  Bookings will appear here when customers make reservations.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              Week of {format(weekStart, 'dd/MM/yyyy')}
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Return to today
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayBookings = getBookingsForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <Card 
                key={day.toISOString()} 
                className={`min-h-32 cursor-pointer hover:shadow-md transition-shadow ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <CardContent className="p-2">
                  <div className="text-center mb-2">
                    <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {dayBookings.length > 0 ? (
                      <div className="text-center">
                        <div className="text-xs p-1 rounded bg-blue-100 text-blue-800">
                          {dayBookings.length} booking{dayBookings.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {weekDays.some(day => getBookingsForDate(day).length === 0) && (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Week total: {weekDays.reduce((total, day) => total + getBookingsForDate(day).length, 0)} bookings
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderDayPopup = () => {
    if (!selectedDate) return null;
    
    const dayBookings = getBookingsForDate(selectedDate);

    return (
      <Dialog open={showDayPopup} onOpenChange={setShowDayPopup}>
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
                          onClick={() => setViewingBooking(booking)}
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
                    setShowDayPopup(false);
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

  return (
    <>
      {viewMode === 'day' ? renderDayView() : renderWeekView()}
      {renderDayPopup()}
      {viewingBooking && (
        <BookingViewModal
          booking={viewingBooking}
          onClose={() => setViewingBooking(null)}
          onStatusUpdate={onStatusUpdate}
          open={!!viewingBooking}
        />
      )}
    </>
  );
};
