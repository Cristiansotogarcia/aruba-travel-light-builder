import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
    startDate && endDate ? { from: parseISO(startDate), to: parseISO(endDate) } : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setRange(toIso(range.from), toIso(range.to));
      setOpen(false);
    }
  };

  const label =
    startDate && endDate
      ? `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d, yyyy')}`
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
            min={MIN_NIGHTS + 1} // react-day-picker min counts days; N nights = N+1 days
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
