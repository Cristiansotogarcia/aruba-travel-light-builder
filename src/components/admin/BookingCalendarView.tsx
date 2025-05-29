
import { useState } from 'react';
import { addDays, addWeeks, subWeeks } from 'date-fns';
import { BookingViewModal } from './BookingViewModal';
import { CalendarNavigation } from './calendar/CalendarNavigation';
import { CalendarDayView } from './calendar/CalendarDayView';
import { CalendarWeekView } from './calendar/CalendarWeekView';
import { DayPopupDialog } from './calendar/DayPopupDialog';
import { Booking, CalendarViewProps } from './calendar/types';

export const BookingCalendarView = ({ bookings, viewMode, onStatusUpdate, onCreateBooking }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : addDays(prev, -1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowDayPopup(true);
  };

  const handleReturnToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <>
      <div className="space-y-4">
        <CalendarNavigation
          currentDate={currentDate}
          viewMode={viewMode}
          onNavigate={navigateDate}
          onToday={handleReturnToToday}
        />

        {viewMode === 'day' ? (
          <CalendarDayView
            bookings={bookings}
            currentDate={currentDate}
          />
        ) : (
          <CalendarWeekView
            bookings={bookings}
            currentDate={currentDate}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      <DayPopupDialog
        isOpen={showDayPopup}
        onClose={() => setShowDayPopup(false)}
        selectedDate={selectedDate}
        bookings={bookings}
        onCreateBooking={onCreateBooking}
        onViewBooking={setViewingBooking}
      />

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
