
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, ArrowLeft } from 'lucide-react';

interface BookingFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  showListView: boolean;
  onReturnToCalendar: () => void;
  calendarView: 'day' | 'week';
  onCalendarViewChange: (value: 'day' | 'week') => void;
}

export const BookingFilters = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  showListView,
  onReturnToCalendar,
  calendarView,
  onCalendarViewChange
}: BookingFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-4 items-start justify-between">
      <div className="flex gap-4 flex-wrap flex-1">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, email, or booking ID..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 items-end">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        
        {showListView && (
          <Button
            variant="outline"
            onClick={onReturnToCalendar}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to calendar
          </Button>
        )}
        
        {!showListView && (
          <div className="flex items-center gap-2">
            <ToggleGroup 
              value={calendarView} 
              onValueChange={(value) => value && onCalendarViewChange(value as 'day' | 'week')} 
              type="single"
            >
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </div>
    </div>
  );
};
