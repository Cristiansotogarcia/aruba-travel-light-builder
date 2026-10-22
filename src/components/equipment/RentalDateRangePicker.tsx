import { useEffect, useRef, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRentalDates } from '@/hooks/useRentalDates';
import { MIN_NIGHTS } from '@/lib/rentalDates';

const toIso = (d: Date) => format(d, 'yyyy-MM-dd');

interface RentalDateRangePickerProps {
  /** Open this picker when an add-to-cart is refused for missing dates. One per page. */
  respondToRequests?: boolean;
}

export function RentalDateRangePicker({ respondToRequests = false }: RentalDateRangePickerProps = {}) {
  const { startDate, endDate, setRange, clear, pickerRequest } = useRentalDates();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const seenRequest = useRef(pickerRequest);

  useEffect(() => {
    if (!respondToRequests || pickerRequest === seenRequest.current) return;
    seenRequest.current = pickerRequest;
    rootRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    setOpen(true);
  }, [pickerRequest, respondToRequests]);

  const committed: DateRange | undefined =
    startDate && endDate ? { from: parseISO(startDate), to: parseISO(endDate) } : undefined;

  // The calendar needs to reflect the in-progress (first) click before a full
  // range exists, so we hold a local draft instead of feeding it only the
  // committed store value (a controlled picker discards partial selections).
  const [draft, setDraft] = useState<DateRange | undefined>(committed);

  // Re-sync the draft with the committed range whenever the popover opens.
  useEffect(() => {
    if (open) setDraft(committed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSelect = (range: DateRange | undefined) => {
    setDraft(range);
    if (range?.from && range?.to) {
      setRange(toIso(range.from), toIso(range.to));
      setOpen(false);
    }
  };

  const handleClear = () => {
    clear();
    setDraft(undefined);
  };

  const label =
    startDate && endDate
      ? `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d, yyyy')}`
      : 'Select your rental dates';

  return (
    <div ref={rootRef} className="flex items-center gap-2">
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
            selected={draft}
            onSelect={handleSelect}
            min={MIN_NIGHTS} // react-day-picker v9 compares calendar-day difference, i.e. nights
            disabled={{ before: new Date() }}
            autoFocus
          />
          <p className="px-4 pb-3 text-sm text-muted-foreground" aria-live="polite">
            {draft?.from && !draft?.to
              ? `Now pick your return date, at least ${MIN_NIGHTS} nights after ${format(draft.from, 'MMM d')}.`
              : `Pick your start date. Minimum ${MIN_NIGHTS} nights.`}
          </p>
        </PopoverContent>
      </Popover>
      {startDate && endDate && (
        <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
      )}
    </div>
  );
}
