import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { rentalDays } from '@/lib/pricing/bookingTotals';

const toIso = (d: Date) => format(d, 'yyyy-MM-dd');

interface StepDatesProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

/**
 * Rental range picker for the wizard. Uses the same v9 draft-state pattern as
 * RentalDateRangePicker (a controlled range picker discards the first click, so
 * we hold a local draft and only commit once both ends exist), but keeps its own
 * state instead of the global rentalDates context — staff must be able to create
 * orders without disturbing the customer-facing date selection.
 */
export function StepDates({ startDate, endDate, onChange }: StepDatesProps) {
  const committed: DateRange | undefined =
    startDate && endDate
      ? { from: parseISO(startDate), to: parseISO(endDate) }
      : startDate
        ? { from: parseISO(startDate), to: undefined }
        : undefined;
  const [draft, setDraft] = useState<DateRange | undefined>(committed);

  const handleSelect = (range: DateRange | undefined) => {
    setDraft(range);
    if (range?.from && range?.to) {
      onChange(toIso(range.from), toIso(range.to));
    } else if (range?.from) {
      // First click: clear any previously committed end so the parent knows the
      // range is incomplete again.
      onChange(toIso(range.from), '');
    }
  };

  const nights = startDate && endDate ? rentalDays(startDate, endDate) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Rental dates</h3>
        <p className="text-sm text-muted-foreground">
          Pick the start and end of the rental. Availability is checked against these dates.
        </p>
      </div>

      <div className="flex justify-center rounded-lg border border-border/60 bg-background p-2">
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={draft}
          onSelect={handleSelect}
          min={2} // react-day-picker counts days; 2 days = 1 night minimum
          disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
          autoFocus
          className="pointer-events-auto"
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {startDate && endDate ? (
          <span>
            <span className="font-medium">
              {format(parseISO(startDate), 'EEE, MMM d')} – {format(parseISO(endDate), 'EEE, MMM d, yyyy')}
            </span>{' '}
            <span className="text-muted-foreground">
              ({nights} {nights === 1 ? 'night' : 'nights'})
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">No dates selected yet.</span>
        )}
      </div>
    </div>
  );
}
