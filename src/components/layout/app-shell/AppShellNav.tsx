import { ChevronDown, ChevronRight } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { type AppNavEntry, type AppNavLeaf, flattenNav, isNavGroup } from './types';

interface AppShellNavProps {
  entries: AppNavEntry[];
  activeSection: string;
  onSelect: (id: string) => void;
  openGroups: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
  /** Desktop icon-rail mode. Ignored on mobile. */
  collapsed?: boolean;
}

const leafButtonClasses = (isActive: boolean) =>
  cn(
    'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
  );

export const AppShellNav = ({
  entries,
  activeSection,
  onSelect,
  openGroups,
  onToggleGroup,
  collapsed = false,
}: AppShellNavProps) => {
  // Collapsed desktop rail: a flat column of icon-only targets with tooltips.
  if (collapsed) {
    const leaves = flattenNav(entries);
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col items-center gap-1.5 py-1">
          {leaves.map((leaf) => {
          const Icon = leaf.icon;
          const isActive = leaf.id === activeSection;
          return (
            <Tooltip key={leaf.id} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect(leaf.id)}
                  aria-label={leaf.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{leaf.label}</TooltipContent>
            </Tooltip>
          );
        })}
        </div>
      </TooltipProvider>
    );
  }

  const renderLeaf = (leaf: AppNavLeaf, nested = false) => {
    const Icon = leaf.icon;
    const isActive = leaf.id === activeSection;
    return (
      <button
        key={leaf.id}
        type="button"
        onClick={() => onSelect(leaf.id)}
        aria-current={isActive ? 'page' : undefined}
        className={leafButtonClasses(isActive)}
      >
        <Icon className={cn('shrink-0', nested ? 'h-4 w-4' : 'h-5 w-5')} />
        <span className={cn('truncate', nested ? 'text-sm' : 'font-medium')}>{leaf.label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        if (!isNavGroup(entry)) {
          return renderLeaf(entry);
        }

        const GroupIcon = entry.icon;
        const isGroupActive = entry.items.some((item) => item.id === activeSection);
        const isOpen = openGroups[entry.id] ?? false;

        return (
          <Collapsible key={entry.id} open={isOpen} onOpenChange={() => onToggleGroup(entry.id)}>
            <div className="overflow-hidden rounded-2xl border border-sidebar-border/70 bg-sidebar/40">
              <CollapsibleTrigger
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  'hover:bg-sidebar-accent/40',
                )}
              >
                <span className="flex items-center gap-3">
                  <GroupIcon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isGroupActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/70',
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isGroupActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/80',
                    )}
                  >
                    {entry.label}
                  </span>
                </span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 px-2 pb-2">
                  {entry.items.map((item) => renderLeaf(item, true))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
};
