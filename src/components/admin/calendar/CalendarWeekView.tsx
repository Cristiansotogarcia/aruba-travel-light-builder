
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Truck, Package } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Booking } from '@/components/admin/calendar/types';
import { getTotalCountsForDate } from './bookingUtils';

interface CalendarWeekViewProps {
  bookings: Booking[];
  currentDate: Date;
  onDayClick: (date: Date) => void;
}

export const CalendarWeekView = ({ bookings, currentDate, onDayClick }: CalendarWeekViewProps) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const { deliveryCount, pickupCount, totalCount } = getTotalCountsForDate(bookings, day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <Card 
              key={day.toISOString()} 
              className={`min-h-32 cursor-pointer hover:shadow-md transition-shadow ${isToday ? 'ring-2 ring-blue-500' : ''} ${totalCount > 0 ? 'hover:bg-blue-50' : ''}`}
              onClick={() => totalCount > 0 && onDayClick(day)}
            >
              <CardContent className="p-2">
                <div className="text-center mb-2">
                  <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                  <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                <div className="space-y-1">
                  {deliveryCount > 0 && (
                    <Badge variant="secondary" className="w-full text-xs flex items-center justify-center gap-1 bg-green-100 text-green-800">
                      <Truck className="h-3 w-3" />
                      {deliveryCount} delivery{deliveryCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {pickupCount > 0 && (
                    <Badge variant="secondary" className="w-full text-xs flex items-center justify-center gap-1 bg-orange-100 text-orange-800">
                      <Package className="h-3 w-3" />
                      {pickupCount} pickup{pickupCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {weekDays.every(day => getTotalCountsForDate(bookings, day).totalCount === 0) && (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            No deliveries or pickups scheduled for this week
          </p>
        </div>
      )}
    </div>
  );
};
