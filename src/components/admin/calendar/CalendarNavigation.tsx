
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarNavigationProps {
  currentDate: Date;
  viewMode: 'day' | 'week';
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
}

export const CalendarNavigation = ({ 
  currentDate, 
  viewMode, 
  onNavigate, 
  onToday 
}: CalendarNavigationProps) => {
  const getTitle = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'EEEE, dd/MM/yyyy');
    } else {
      return `Week of ${format(currentDate, 'dd/MM/yyyy')}`;
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => onNavigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {getTitle()}
        </h2>
        <Button variant="outline" size="sm" onClick={() => onNavigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="outline" onClick={onToday}>
        Return to today
      </Button>
    </div>
  );
};
