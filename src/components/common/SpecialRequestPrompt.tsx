import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * "Don't see what you need?" nudge toward the Special Request form, for
 * browsing contexts (equipment catalog) rather than the booking flow
 * (which uses LastMinuteContactPrompt instead).
 * See PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md (Workstream B).
 */
export const SpecialRequestPrompt = () => {
  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-center text-sm">
      <p className="text-foreground">
        Don&apos;t see what you need? Contact us, we might have it or get it for you.{' '}
        <Link to="/contact" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Send us your special request here <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
};

export default SpecialRequestPrompt;
