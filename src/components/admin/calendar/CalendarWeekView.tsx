
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Booking } from './types';

interface CalendarWeekViewProps {
  bookings: Booking[];
  currentDate: Date;
  onDayClick: (date: Date) => void;
}

export const CalendarWeekView = ({ bookings, currentDate, onDayClick }: CalendarWeekViewProps) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      return date >= startDate && date <= endDate;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayBookings = getBookingsForDate(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <Card 
              key={day.toISOString()} 
              className={`min-h-32 cursor-pointer hover:shadow-md transition-shadow ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => onDayClick(day)}
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
