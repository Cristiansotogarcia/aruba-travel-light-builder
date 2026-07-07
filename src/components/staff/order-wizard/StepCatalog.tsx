import { useMemo, useState } from 'react';
import { Search, Plus, Minus, ImageOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cardImage } from '@/lib/images';
import { cn } from '@/lib/utils';
import { useStaffCatalog } from './useStaffCatalog';
import type { CatalogItem, WizardCartLine } from './types';
import type { AvailabilityMap } from '@/lib/queries/availability';

interface StepCatalogProps {
  cart: WizardCartLine[];
  availability: AvailabilityMap | undefined;
  availabilityLoading: boolean;
  onSetQuantity: (item: CatalogItem, quantity: number) => void;
}

/** Availability cap for an item: the RPC re-checks anyway, this is UX guidance. */
function availableFor(item: CatalogItem, availability: AvailabilityMap | undefined): number {
  if (availability && item.id in availability) return availability[item.id];
  return item.stock_quantity;
}

export function StepCatalog({ cart, availability, availabilityLoading, onSetQuantity }: StepCatalogProps) {
  const { groups, isLoading, error } = useStaffCatalog();
  const [search, setSearch] = useState('');

  const qtyFor = (id: string) => cart.find((l) => l.item.id === id)?.quantity ?? 0;

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading catalog…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Could not load the equipment catalog. {error instanceof Error ? error.message : ''}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Add equipment</h3>
        <p className="text-sm text-muted-foreground">
          Live catalog. Quantities are capped at what is available for the selected dates.
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 pb-2 pt-1 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment…"
            className="pl-9"
          />
        </div>
      </div>

      {filteredGroups.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No equipment matches “{search}”.</p>
      )}

      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.category} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.category}
            </h4>
            <div className="space-y-2">
              {group.items.map((item) => {
                const available = availableFor(item, availability);
                const qty = qtyFor(item.id);
                const atCap = qty >= available;
                const soldOut = available <= 0;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-2.5',
                      qty > 0 ? 'border-primary/50 bg-primary/5' : 'border-border/60',
                    )}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        <img
                          src={cardImage(item.image)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageOff className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.price_per_day.toFixed(2)}/day</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-1 h-5 px-1.5 text-[10px]',
                          availabilityLoading
                            ? 'text-muted-foreground'
                            : soldOut
                              ? 'border-destructive/40 text-destructive'
                              : available <= 3
                                ? 'border-amber-300 text-amber-700'
                                : 'border-emerald-300 text-emerald-700',
                        )}
                      >
                        {availabilityLoading ? 'checking…' : soldOut ? 'Unavailable' : `${available} available`}
                      </Badge>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={qty <= 0}
                        onClick={() => onSetQuantity(item, Math.max(0, qty - 1))}
                        aria-label={`Remove one ${item.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-7 text-center text-sm font-medium tabular-nums">{qty}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={soldOut || atCap}
                        onClick={() => onSetQuantity(item, qty + 1)}
                        aria-label={`Add one ${item.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
