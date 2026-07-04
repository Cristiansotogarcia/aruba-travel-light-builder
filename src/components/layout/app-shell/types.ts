import type { LucideIcon } from 'lucide-react';

/** A single, navigable destination in the app shell sidebar. */
export interface AppNavLeaf {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** A labelled, collapsible cluster of destinations. */
export interface AppNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AppNavLeaf[];
}

export type AppNavEntry = AppNavLeaf | AppNavGroup;

export const isNavGroup = (entry: AppNavEntry): entry is AppNavGroup =>
  Array.isArray((entry as AppNavGroup).items);

/** Flatten every reachable leaf, in order, for the collapsed icon rail. */
export const flattenNav = (entries: AppNavEntry[]): AppNavLeaf[] =>
  entries.flatMap((entry) => (isNavGroup(entry) ? entry.items : [entry]));

export const findActiveLabel = (
  entries: AppNavEntry[],
  activeSection: string,
): string | null => {
  for (const entry of entries) {
    if (isNavGroup(entry)) {
      const hit = entry.items.find((item) => item.id === activeSection);
      if (hit) return hit.label;
    } else if (entry.id === activeSection) {
      return entry.label;
    }
  }
  return null;
};

export const findGroupIdForSection = (
  entries: AppNavEntry[],
  activeSection: string,
): string | null => {
  for (const entry of entries) {
    if (isNavGroup(entry) && entry.items.some((item) => item.id === activeSection)) {
      return entry.id;
    }
  }
  return null;
};
