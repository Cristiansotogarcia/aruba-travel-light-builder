import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, PackageCheck, RotateCcw, Search, Store, Truck, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { searchPosCustomers, type PosCustomerMatch } from '@/lib/queries/pos';
import type { PosCustomerFields, PosLeg, PosReturnLeg } from './types';

interface PosStepCustomerProps {
  customer: PosCustomerFields;
  onCustomerChange: (fields: PosCustomerFields) => void;
  leg: PosLeg;
  onLegChange: (leg: PosLeg) => void;
  returnLeg: PosReturnLeg;
  onReturnLegChange: (leg: PosReturnLeg) => void;
}

const LEG_OPTIONS: Array<{ value: PosLeg; label: string; icon: typeof Store }> = [
  { value: 'pickup_now', label: 'Store pickup now', icon: Store },
  { value: 'pickup_later', label: 'Store pickup later', icon: Clock },
  { value: 'delivery', label: 'Delivery', icon: Truck },
];

const RETURN_OPTIONS: Array<{ value: PosReturnLeg; label: string; icon: typeof PackageCheck }> = [
  { value: 'store_return', label: 'Store return', icon: PackageCheck },
  { value: 'collection', label: 'Collection', icon: RotateCcw },
];

/** Screen 2: search an existing customer by name/email/phone, or quick add a
 * new one, plus the outbound/return leg choice. */
export function PosStepCustomer({
  customer,
  onCustomerChange,
  leg,
  onLegChange,
  returnLeg,
  onReturnLegChange,
}: PosStepCustomerProps) {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'search' | 'quick-add'>('search');

  const { data: matches = [], isFetching } = useQuery({
    queryKey: ['pos-customer-search', search],
    queryFn: () => searchPosCustomers(search),
    enabled: mode === 'search' && search.trim().length >= 2,
    staleTime: 30_000,
  });

  const selectMatch = (match: PosCustomerMatch) => {
    onCustomerChange({
      name: match.name,
      email: match.email,
      phone: match.phone,
      address: match.address,
      roomNumber: match.roomNumber,
    });
    setMode('quick-add');
  };

  const update = (field: keyof PosCustomerFields, value: string) =>
    onCustomerChange({ ...customer, [field]: value });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Customer</h3>
        <p className="text-sm text-muted-foreground">Find a returning customer or add a new one.</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'search' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => setMode('search')}
        >
          <Search className="h-3.5 w-3.5" /> Search existing
        </Button>
        <Button
          type="button"
          variant={mode === 'quick-add' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => setMode('quick-add')}
        >
          <UserPlus className="h-3.5 w-3.5" /> Quick add
        </Button>
      </div>

      {mode === 'search' ? (
        <div className="space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
          />
          {search.trim().length >= 2 && (
            <div className="space-y-2">
              {isFetching && <p className="text-sm text-muted-foreground">Searching…</p>}
              {!isFetching && matches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No match. Switch to Quick add to create a new customer.
                </p>
              )}
              {matches.map((m) => (
                <Card
                  key={`${m.email}-${m.phone}-${m.name}`}
                  className="cursor-pointer border-border/60 transition-colors hover:border-primary/50"
                  onClick={() => selectMatch(m)}
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email || m.phone || 'No contact on file'}</p>
                    </div>
                    <Button type="button" size="sm" variant="ghost">
                      Use
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {customer.name && (
            <p className="text-sm text-emerald-700">
              Selected: {customer.name}. Switch to Quick add to edit details.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pos-customer-name">Full name</Label>
            <Input
              id="pos-customer-name"
              value={customer.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Customer name"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pos-customer-phone">Phone</Label>
              <Input
                id="pos-customer-phone"
                value={customer.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+297 …"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-customer-email">Email (optional)</Label>
              <Input
                id="pos-customer-email"
                type="email"
                value={customer.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="customer@email.com"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pos-customer-address">Hotel / address (optional)</Label>
              <Input
                id="pos-customer-address"
                value={customer.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Accommodation / street address"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-customer-room">Room / unit (optional)</Label>
              <Input
                id="pos-customer-room"
                value={customer.roomNumber}
                onChange={(e) => update('roomNumber', e.target.value)}
                placeholder="e.g. 214"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-sm">How does the customer get the equipment?</Label>
        <div className="grid grid-cols-3 gap-2">
          {LEG_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={leg === value ? 'default' : 'outline'}
              className="h-auto flex-col gap-1 py-3 text-xs"
              onClick={() => onLegChange(value)}
              aria-pressed={leg === value}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
        {leg === 'delivery' && !customer.address.trim() && (
          <p className="text-xs text-amber-700">Delivery needs an address — fill it in above.</p>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-sm">How does it come back?</Label>
        <div className="grid grid-cols-2 gap-2">
          {RETURN_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={returnLeg === value ? 'default' : 'outline'}
              className="h-auto flex-col gap-1 py-3 text-xs"
              onClick={() => onReturnLegChange(value)}
              aria-pressed={returnLeg === value}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
