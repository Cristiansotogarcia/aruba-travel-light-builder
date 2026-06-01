import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRentalDates } from '@/hooks/useRentalDates';
import { MIN_NIGHTS } from '@/lib/rentalDates';

const toIso = (d: Date) => format(d, 'yyyy-MM-dd');

export function RentalDateRangePicker() {
  const { startDate, endDate, setRange, clear } = useRentalDates();
  const [open, setOpen] = useState(false);
  const selected: DateRange | undefined =
    startDate && endDate ? { from: new Date(startDate), to: new Date(endDate) } : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setRange(toIso(range.from), toIso(range.to));
      setOpen(false);
    }
  };

  const label =
    startDate && endDate
      ? `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`
      : 'Select your rental dates';

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={selected}
            onSelect={handleSelect}
            min={MIN_NIGHTS}
            disabled={{ before: new Date() }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {startDate && endDate && (
        <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
      )}
    </div>
  );
}
