
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, ArrowLeft, ChevronDown } from 'lucide-react';

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
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending_admin_review', label: 'Pending Admin Review' },
    { value: 'pending', label: 'Pending Payment' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'undeliverable', label: 'Undeliverable' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const currentStatusLabel = statusOptions.find(option => option.value === statusFilter)?.label || 'All Statuses';

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
      
      {showListView && (
        <div className="flex flex-col gap-2 items-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-3 py-2 w-[180px] justify-between"
              >
                {currentStatusLabel}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onStatusFilterChange(option.value)}
                  className={statusFilter === option.value ? 'bg-accent' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="outline"
            onClick={onReturnToCalendar}
            className="h-10 px-3 py-2 w-[180px] flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to calendar
          </Button>
        </div>
      )}
    </div>
  );
};
