import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Nudges customers who can't make the booking flow work (no dates available,
 * last-minute rental, or a special arrangement) toward the Special Request
 * form at /contact instead of bouncing off the page. Also reminds tourists
 * that walking into the store is an option.
 * See PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md (Workstream B).
 */
export const LastMinuteContactPrompt = () => {
  return (
    <div className="mb-8 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
      <p className="text-foreground">
        Need a last minute rental? Can&apos;t find your dates?{' '}
        <Link to="/contact?type=last_minute" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Contact us here <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
      <p className="mt-2 text-muted-foreground sm:mt-0">
        Walk-ins welcome at our store during opening hours.
      </p>
    </div>
  );
};

export default LastMinuteContactPrompt;
