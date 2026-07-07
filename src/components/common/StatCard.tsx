import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Icon colour class for the plain-icon variant, e.g. "text-blue-600". */
  tone?: string;
  /**
   * Wrapper classes for the boxed-icon variant, e.g. "bg-emerald-100 text-emerald-700".
   * When set the icon renders inside a rounded tile instead of bare.
   */
  iconWrapperClassName?: string;
  description?: ReactNode;
  /** Fire an in-page action (e.g. switch dashboard section / scroll to a list). */
  onClick?: () => void;
  /** Navigate to an internal route (react-router). */
  to?: string;
  /** Navigate to an external URL (opens in a new tab). */
  href?: string;
  /**
   * Extra context for assistive tech describing where the card leads,
   * e.g. "View pending reservations". Only used when interactive.
   */
  actionHint?: string;
  className?: string;
}

/**
 * A summary / KPI tile. When any of `onClick`, `to`, or `href` is provided the
 * whole card becomes a real navigation affordance: proper button/link
 * semantics, keyboard operable, hover + focus-visible states, cursor-pointer,
 * and a chevron that hints it takes you to the records it counts.
 */
export const StatCard = ({
  label,
  value,
  icon: Icon,
  tone,
  iconWrapperClassName,
  description,
  onClick,
  to,
  href,
  actionHint,
  className,
}: StatCardProps) => {
  const interactive = Boolean(onClick || to || href);

  const inner = (
    <Card
      className={cn(
        'h-full',
        interactive &&
          'transition-all group-hover:border-primary/50 group-hover:shadow-md group-focus-visible:border-primary/50',
        className,
      )}
    >
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {Icon &&
            (iconWrapperClassName ? (
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  iconWrapperClassName,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            ) : (
              <Icon className={cn('h-8 w-8', tone)} />
            ))}
          {interactive && (
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!interactive) {
    return inner;
  }

  const wrapperClass = cn(
    'group block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  );
  const ariaLabel = actionHint ? `${label}. ${actionHint}` : undefined;

  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel} className={wrapperClass}>
        {inner}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={ariaLabel}
        className={wrapperClass}
      >
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={wrapperClass}>
      {inner}
    </button>
  );
};

export default StatCard;
