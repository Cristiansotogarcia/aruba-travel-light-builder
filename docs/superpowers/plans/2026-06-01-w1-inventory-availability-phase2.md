# W1 Inventory & Availability — Phase 2 Implementation Plan (Dates-First Browsing)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let customers pick rental dates up front and see real per-date availability across the catalog, detail page, and cart, carrying those dates into the booking form.

**Architecture:** A `RentalDatesProvider` context holds the selected `{ startDate, endDate }` (YYYY-MM-DD), persisted to the URL (`?start=&end=`) + localStorage. A `useAvailability` TanStack-Query hook calls the existing `get_equipment_availability(p_start, p_end, p_equipment_ids)` RPC (built in Phase 1) and returns an `equipmentId → availableUnits` map. The catalog, detail page, and cart consume both; the booking form initializes its dates from the context. Reuses the existing shadcn `Calendar` (react-day-picker v9 `mode="range"`) and the repo's `DateRange`/Popover pattern.

**Tech Stack:** React 19, react-router-dom v6 (`useSearchParams`), TanStack Query v5, react-day-picker v9 via `src/components/ui/calendar.tsx`, Tailwind/shadcn, Vitest + React Testing Library.

**Spec:** [docs/superpowers/specs/2026-06-01-w1-inventory-availability-design.md](../specs/2026-06-01-w1-inventory-availability-design.md) §9.

**Depends on:** Phase 1 (the `get_equipment_availability` RPC is live on the DB).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/rentalDates.ts` (create) | Pure helpers: parse/serialize a date range to/from URL params + validate (min 3 nights, not past). |
| `src/lib/rentalDates.test.ts` (create) | Unit tests for the helpers. |
| `src/hooks/useRentalDates.tsx` (create) | Context provider for the selected range; persists to URL + localStorage. |
| `src/lib/queries/availability.ts` (create) | `getEquipmentAvailability(start,end,ids?)` → `Record<string,number>` via the RPC. |
| `src/lib/queries/availability.test.ts` (create) | Unit test (mocked supabase rpc) for the map shape. |
| `src/hooks/useAvailability.ts` (create) | TanStack Query wrapper keyed by the range; returns the availability map. |
| `src/components/equipment/RentalDateRangePicker.tsx` (create) | Popover + `Calendar mode="range"` writing to `useRentalDates`. |
| `src/App.tsx` (modify) | Wrap routes in `RentalDatesProvider`. |
| `src/pages/Equipment.tsx` (modify) | Render the picker; pass per-card available units. |
| `src/components/equipment/EquipmentCard.tsx` (modify) | Show "X available for your dates" / disable when 0; cap qty. |
| `src/pages/EquipmentItem.tsx` (modify) | Cap quantity to date availability; show note. |
| `src/hooks/useBooking.ts` (modify) | Initialize `startDate`/`endDate` from `useRentalDates`. |
| `src/components/cart/Cart.tsx` (modify) | Show the selected rental dates + a "change dates" affordance. |

---

## Task 1: Rental-date helpers (pure)

**Files:** Create `src/lib/rentalDates.ts`, `src/lib/rentalDates.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rentalDates.test.ts
import { describe, it, expect } from 'vitest';
import { parseRangeFromParams, isValidRange, MIN_NIGHTS } from './rentalDates';

describe('parseRangeFromParams', () => {
  it('reads start/end from URLSearchParams', () => {
    const p = new URLSearchParams('start=2027-01-10&end=2027-01-14');
    expect(parseRangeFromParams(p)).toEqual({ startDate: '2027-01-10', endDate: '2027-01-14' });
  });
  it('returns nulls when absent or malformed', () => {
    expect(parseRangeFromParams(new URLSearchParams(''))).toEqual({ startDate: null, endDate: null });
    expect(parseRangeFromParams(new URLSearchParams('start=nope'))).toEqual({ startDate: null, endDate: null });
  });
});

describe('isValidRange', () => {
  const today = new Date('2026-06-10T12:00:00.000Z');
  it('requires both dates, end >= start + MIN_NIGHTS, start not in the past', () => {
    expect(isValidRange('2027-01-10', '2027-01-13', today)).toBe(true); // 3 nights
    expect(isValidRange('2027-01-10', '2027-01-12', today)).toBe(false); // 2 nights < min
    expect(isValidRange('2020-01-10', '2020-01-20', today)).toBe(false); // past
    expect(isValidRange(null, '2027-01-13', today)).toBe(false);
  });
  it('MIN_NIGHTS matches the booking rule (3)', () => {
    expect(MIN_NIGHTS).toBe(3);
  });
});
```

- [ ] **Step 2: Run it, verify FAIL** — `npx vitest run src/lib/rentalDates.test.ts` (module missing).

- [ ] **Step 3: Implement**

```ts
// src/lib/rentalDates.ts
export const MIN_NIGHTS = 3; // mirrors the booking minimum in useBooking.ts

export interface RentalRange {
  startDate: string | null; // 'YYYY-MM-DD'
  endDate: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dayEpoch(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function parseRangeFromParams(params: URLSearchParams): RentalRange {
  const start = params.get('start');
  const end = params.get('end');
  return {
    startDate: start && ISO_DATE.test(start) ? start : null,
    endDate: end && ISO_DATE.test(end) ? end : null,
  };
}

export function isValidRange(
  startDate: string | null,
  endDate: string | null,
  now: Date = new Date(),
): boolean {
  if (!startDate || !endDate || !ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) return false;
  const start = dayEpoch(startDate);
  const end = dayEpoch(endDate);
  const todayEpoch = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (start < todayEpoch) return false;
  const nights = (end - start) / 86_400_000;
  return nights >= MIN_NIGHTS;
}
```

- [ ] **Step 4: Run, verify PASS** — `npx vitest run src/lib/rentalDates.test.ts`.
- [ ] **Step 5: Commit** — `git add src/lib/rentalDates.ts src/lib/rentalDates.test.ts && git commit -m "feat(dates): rental-date range helpers + tests"`

---

## Task 2: Availability query layer

**Files:** Create `src/lib/queries/availability.ts`, `src/lib/queries/availability.test.ts`

- [ ] **Step 1: Write the failing test** (mirror the mock style of `src/lib/queries/bookings.test.ts`)

```ts
// src/lib/queries/availability.test.ts
import { describe, it, expect, vi } from 'vitest';

const { rpcFn } = vi.hoisted(() => ({ rpcFn: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: rpcFn } }));

import { getEquipmentAvailability } from './availability';

describe('getEquipmentAvailability', () => {
  it('calls the RPC and returns an id→units map', async () => {
    rpcFn.mockResolvedValue({ data: [{ equipment_id: 'a', available_units: 2 }, { equipment_id: 'b', available_units: 0 }], error: null });
    const map = await getEquipmentAvailability('2027-01-10', '2027-01-14');
    expect(rpcFn).toHaveBeenCalledWith('get_equipment_availability', { p_start: '2027-01-10', p_end: '2027-01-14', p_equipment_ids: null });
    expect(map).toEqual({ a: 2, b: 0 });
  });
  it('throws on RPC error', async () => {
    rpcFn.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(getEquipmentAvailability('2027-01-10', '2027-01-14')).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/lib/queries/availability.ts
import { supabase } from '@/integrations/supabase/client';

export type AvailabilityMap = Record<string, number>;

export async function getEquipmentAvailability(
  start: string,
  end: string,
  equipmentIds: string[] | null = null,
): Promise<AvailabilityMap> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_equipment_availability', {
    p_start: start,
    p_end: end,
    p_equipment_ids: equipmentIds,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ equipment_id: string; available_units: number }>;
  return rows.reduce<AvailabilityMap>((acc, r) => {
    acc[r.equipment_id] = r.available_units;
    return acc;
  }, {});
}
```

- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** — `git add src/lib/queries/availability.ts src/lib/queries/availability.test.ts && git commit -m "feat(availability): get_equipment_availability query layer + test"`

---

## Task 3: `useRentalDates` context

**Files:** Create `src/hooks/useRentalDates.tsx`; modify `src/App.tsx`

- [ ] **Step 1: Implement the provider**

```tsx
// src/hooks/useRentalDates.tsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseRangeFromParams, type RentalRange } from '@/lib/rentalDates';

interface RentalDatesContextType extends RentalRange {
  setRange: (startDate: string, endDate: string) => void;
  clear: () => void;
}

const STORAGE_KEY = 'rentalDates';
const RentalDatesContext = createContext<RentalDatesContextType | undefined>(undefined);

export const RentalDatesProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [range, setRangeState] = useState<RentalRange>(() => {
    const fromUrl = parseRangeFromParams(searchParams);
    if (fromUrl.startDate && fromUrl.endDate) return fromUrl;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as RentalRange;
    } catch { /* ignore */ }
    return { startDate: null, endDate: null };
  });

  // Keep URL + localStorage in sync with the selected range.
  useEffect(() => {
    if (range.startDate && range.endDate) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(range)); } catch { /* ignore */ }
      const next = new URLSearchParams(searchParams);
      next.set('start', range.startDate);
      next.set('end', range.endDate);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startDate, range.endDate]);

  const setRange = useCallback((startDate: string, endDate: string) => {
    setRangeState({ startDate, endDate });
  }, []);

  const clear = useCallback(() => {
    setRangeState({ startDate: null, endDate: null });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    const next = new URLSearchParams(searchParams);
    next.delete('start'); next.delete('end');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <RentalDatesContext.Provider value={{ ...range, setRange, clear }}>
      {children}
    </RentalDatesContext.Provider>
  );
};

export const useRentalDates = () => {
  const ctx = useContext(RentalDatesContext);
  if (!ctx) throw new Error('useRentalDates must be used within a RentalDatesProvider');
  return ctx;
};
```

- [ ] **Step 2: Wrap routes in the provider** — in `src/App.tsx`, import `RentalDatesProvider` and wrap it INSIDE `<BrowserRouter>` (it needs router context for `useSearchParams`), around the `<Routes>` (e.g. just inside `<BrowserRouter ...>` and around `<PasswordChangeGate />` + `<Suspense>`). Place it outside `<Routes>` so all pages share it.

- [ ] **Step 3: Verify build** — `npx tsc -p tsconfig.app.json --noEmit` (only the 3 known DynamicMap errors). `npx vitest run` (no regressions).
- [ ] **Step 4: Commit** — `git add src/hooks/useRentalDates.tsx src/App.tsx && git commit -m "feat(dates): RentalDatesProvider with URL + localStorage persistence"`

---

## Task 4: `useAvailability` hook

**Files:** Create `src/hooks/useAvailability.ts`

- [ ] **Step 1: Implement**

```ts
// src/hooks/useAvailability.ts
import { useQuery } from '@tanstack/react-query';
import { getEquipmentAvailability, type AvailabilityMap } from '@/lib/queries/availability';
import { isValidRange } from '@/lib/rentalDates';

// Returns an equipmentId→availableUnits map for the given range, or an empty map when no valid range is set.
export function useAvailability(startDate: string | null, endDate: string | null) {
  const enabled = isValidRange(startDate, endDate);
  return useQuery<AvailabilityMap>({
    queryKey: ['equipment-availability', startDate, endDate],
    queryFn: () => getEquipmentAvailability(startDate as string, endDate as string),
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
```

- [ ] **Step 2: Verify** — `npx tsc -p tsconfig.app.json --noEmit`. (No dedicated test — it's a thin wrapper over the tested query layer.)
- [ ] **Step 3: Commit** — `git add src/hooks/useAvailability.ts && git commit -m "feat(availability): useAvailability query hook"`

---

## Task 5: `RentalDateRangePicker` component

**Files:** Create `src/components/equipment/RentalDateRangePicker.tsx`

- [ ] **Step 1: Implement** (reuses shadcn `Calendar`, `Popover`, `Button`; mirrors the admin `DateRange` pattern)

```tsx
// src/components/equipment/RentalDateRangePicker.tsx
import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
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
    startDate && endDate ? { from: new Date(startDate), to: new Date(endDate) } : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setRange(toIso(range.from), toIso(range.to));
      setOpen(false);
    }
  };

  const label =
    startDate && endDate
      ? `${format(new Date(startDate), 'MMM d')} – ${format(new Date(endDate), 'MMM d, yyyy')}`
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
            min={MIN_NIGHTS}
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
```

- [ ] **Step 2: Verify** — `npx tsc -p tsconfig.app.json --noEmit`. If `min` is not accepted by the installed react-day-picker types, remove it (validation also happens in `isValidRange`); keep `disabled={{ before: new Date() }}`.
- [ ] **Step 3: Commit** — `git add src/components/equipment/RentalDateRangePicker.tsx && git commit -m "feat(dates): rental date-range picker (Calendar range mode)"`

---

## Task 6: Catalog wiring (`Equipment.tsx` + `EquipmentCard.tsx`)

**Files:** Modify `src/pages/Equipment.tsx`, `src/components/equipment/EquipmentCard.tsx`

- [ ] **Step 1: Equipment.tsx** — READ the file. Near the top of the results area (just above `<EquipmentFilters>`, ~line 243), render a prominent block:

```tsx
{/* dates-first availability */}
<div className="mb-6 rounded-lg border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
  <div>
    <p className="font-medium">Renting for specific dates?</p>
    <p className="text-sm text-muted-foreground">Pick your dates to see real-time availability.</p>
  </div>
  <RentalDateRangePicker />
</div>
```

Add imports: `import { RentalDateRangePicker } from '@/components/equipment/RentalDateRangePicker';`, `import { useRentalDates } from '@/hooks/useRentalDates';`, `import { useAvailability } from '@/hooks/useAvailability';`.

Inside the component: `const { startDate, endDate } = useRentalDates();` and `const { data: availabilityMap } = useAvailability(startDate, endDate);`. When rendering each `<EquipmentCard>`, pass `availableUnits={startDate && endDate ? (availabilityMap?.[item.id] ?? null) : null}` (null = "dates not chosen / loading", show normal stock display).

- [ ] **Step 2: EquipmentCard.tsx** — READ the file. Add an optional prop `availableUnits?: number | null` to the component's props. Where stock is displayed (~line 225-227) and the Add-to-Cart button is (~line 231):
  - If `availableUnits != null` (dates chosen): replace the "{stock_quantity} in stock" line with either `"{availableUnits} available for your dates"` (when > 0) or a muted `"Not available for these dates"` (when 0). Cap the quantity input `max` to `availableUnits`. Disable the Add-to-Cart button when `availableUnits <= 0`.
  - If `availableUnits == null` (no dates): keep the existing global-stock display and behavior unchanged.
  - Keep all existing behavior intact otherwise.

- [ ] **Step 3: Verify** — `npx tsc -p tsconfig.app.json --noEmit`; `npx vitest run src/components/equipment/EquipmentCard.test.tsx` (the existing card test must still pass — `availableUnits` is optional so it defaults to the old behavior).
- [ ] **Step 4: Commit** — `git add src/pages/Equipment.tsx src/components/equipment/EquipmentCard.tsx && git commit -m "feat(catalog): dates-first availability on the catalog + cards"`

---

## Task 7: Detail page quantity cap (`EquipmentItem.tsx`)

**Files:** Modify `src/pages/EquipmentItem.tsx`

- [ ] **Step 1** — READ the file. Add `const { startDate, endDate } = useRentalDates();` and `const { data: availabilityMap } = useAvailability(startDate, endDate);` (imports as in Task 6). Compute `const dateAvailable = startDate && endDate ? (availabilityMap?.[equipment.id] ?? null) : null;`.
  - Where the quantity `<Input max=...>` is (~line 255-260), set `max={dateAvailable != null ? Math.max(0, dateAvailable) : equipment.stock_quantity}` and clamp `handleQuantityChange` to the same ceiling.
  - Show a note under the quantity when `dateAvailable != null`: `"{dateAvailable} available for {startDate} → {endDate}"` (or "Not available for these dates" when 0), and disable Add-to-Cart when `dateAvailable === 0`.
  - When no dates are set, behavior is unchanged.

- [ ] **Step 2: Verify** — `npx tsc -p tsconfig.app.json --noEmit`; `npx vitest run`.
- [ ] **Step 3: Commit** — `git add src/pages/EquipmentItem.tsx && git commit -m "feat(detail): cap quantity to date availability on the detail page"`

---

## Task 8: Carry dates into booking + show in cart

**Files:** Modify `src/hooks/useBooking.ts`, `src/components/cart/Cart.tsx`

- [ ] **Step 1: useBooking.ts** — READ the file. Import `useRentalDates`. In the hook, read `const { startDate: rdStart, endDate: rdEnd } = useRentalDates();` and seed the initial dates: after the existing cart-sync `useEffect`, add an effect that, only when `bookingData.startDate`/`endDate` are still empty and `rdStart`/`rdEnd` are set, calls `setBookingData(prev => ({ ...prev, startDate: rdStart, endDate: rdEnd }))`. Do not override dates the user has already edited in the form.

```tsx
useEffect(() => {
  if (rdStart && rdEnd) {
    setBookingData(prev =>
      prev.startDate || prev.endDate ? prev : { ...prev, startDate: rdStart, endDate: rdEnd },
    );
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [rdStart, rdEnd]);
```

- [ ] **Step 2: Cart.tsx** — READ the file. Near the cart summary (~line 100-110), if `useRentalDates()` has a range, show a small line: `"Rental dates: {start} → {end}"` with a link/button to `/equipment` to change them; if no range is set, show a subtle hint `"Select rental dates on the catalog to see availability"`. Import `useRentalDates`.

- [ ] **Step 3: Verify** — `npx tsc -p tsconfig.app.json --noEmit`; `npx vitest run`.
- [ ] **Step 4: Commit** — `git add src/hooks/useBooking.ts src/components/cart/Cart.tsx && git commit -m "feat(booking): carry rental dates from catalog into booking + show in cart"`

---

## Task 9: Manual verification

**Files:** none.

- [ ] **Step 1** — `npm run dev`. On `/equipment`, pick a date range → cards show "X available for your dates"; the URL gains `?start=&end=`; reload preserves the selection.
- [ ] **Step 2** — An item with stock fully consumed for those dates (use a far-future range you can reason about, or create a booking via admin) shows "Not available for these dates" and a disabled Add button; a non-overlapping range shows full availability.
- [ ] **Step 3** — Open a product detail with dates set → quantity caps at the available number.
- [ ] **Step 4** — Add an item, go to cart → dates shown; Proceed to Booking → the booking form's dates are pre-filled with the selected range.
- [ ] **Step 5** — Clear dates → catalog returns to plain stock display; no console errors.

---

## Self-Review (plan author)

- **Spec §9 coverage:** date-range picker + persistence (Tasks 1,3,5), catalog availability (Task 6), detail cap (Task 7), cart date-awareness + carry into booking (Task 8), availability via the RPC (Task 2,4). Browsable with no dates = preserved (all date-aware branches guard on `availableUnits != null` / `isValidRange`).
- **Placeholder scan:** the component-edit tasks (6,7,8) describe exact insertion points + behavior with code for the non-trivial pieces; they require READing the target files first (they're modifications to existing UI, so exact line-level edits are made in situ).
- **Type consistency:** `RentalRange`/`parseRangeFromParams`/`isValidRange`/`MIN_NIGHTS` (rentalDates.ts), `AvailabilityMap`/`getEquipmentAvailability` (availability.ts), `useAvailability`, `useRentalDates` are used consistently across tasks. `availableUnits?: number | null` is the single prop contract between catalog and card.
- **Out of scope (later):** admin date-range availability checker UI; edit-booking exclude-self wiring; the `(supabase as any)` cast persists until types are regenerated (shared follow-up).
