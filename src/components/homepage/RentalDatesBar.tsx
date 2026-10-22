import { CalendarDays } from 'lucide-react';
import { RentalDateRangePicker } from '@/components/equipment/RentalDateRangePicker';
import { MIN_NIGHTS } from '@/lib/rentalDates';

// Dates come first: the cart only takes items once a rental range is set,
// so availability is checked against real dates.
export const RentalDatesBar = () => (
  <section className="relative z-20 -mt-10 sm:-mt-12">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl border bg-card p-5 shadow-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <CalendarDays className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Add your rental dates</p>
            <p className="text-sm text-muted-foreground">
              Pick your dates first to see what is available. Minimum {MIN_NIGHTS} nights.
            </p>
          </div>
        </div>
        <RentalDateRangePicker respondToRequests />
      </div>
    </div>
  </section>
);

export default RentalDatesBar;
