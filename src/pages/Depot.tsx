import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { HandoverDialog } from '@/components/depot/HandoverDialog';
import { ReturnDialog } from '@/components/depot/ReturnDialog';
import type { DepotPickup } from '@/components/depot/HandoverDialog';
import { Package, Phone, Calendar, Search, AlertCircle } from 'lucide-react';

const Depot = () => {
  const [pickups, setPickups] = useState<DepotPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeFilter, setCodeFilter] = useState('');
  const [handoverTarget, setHandoverTarget] = useState<DepotPickup | null>(null);
  const [returnTarget, setReturnTarget] = useState<DepotPickup | null>(null);
  const { toast } = useToast();

  const fetchPickups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase as any).rpc('get_depot_pickups');
      if (rpcError) {
        const msg: string = rpcError.message || 'Unknown error';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('not authorized') || rpcError.code === '42501') {
          setError('You are not authorized to view depot pickups. Please contact an administrator.');
        } else {
          setError(msg);
        }
        return;
      }
      setPickups((data as DepotPickup[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load depot pickups.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPickups();
  }, [fetchPickups]);

  const filteredPickups = useMemo(() => {
    const q = codeFilter.trim().toLowerCase();
    if (!q) return pickups;
    return pickups.filter((p) => p.pickup_code.toLowerCase().includes(q));
  }, [codeFilter, pickups]);

  const handleActionCompleted = useCallback(async () => {
    toast({ title: 'Refreshing…' });
    await fetchPickups();
  }, [fetchPickups, toast]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderPickupCard = (pickup: DepotPickup) => (
    <Card key={pickup.booking_id} className="border border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{pickup.customer_name}</h3>
              <Badge variant="outline" className="font-mono text-xs">
                {pickup.pickup_code}
              </Badge>
              <Badge
                className={
                  pickup.next_action === 'handover'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }
                variant="outline"
              >
                {pickup.next_action === 'handover' ? 'Awaiting hand-over' : 'Awaiting return'}
              </Badge>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${pickup.customer_phone}`} className="hover:text-foreground">
                  {pickup.customer_phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {formatDate(pickup.start_date)} – {formatDate(pickup.end_date)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</p>
              <div className="flex flex-wrap gap-2">
                {pickup.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-xs"
                  >
                    <Package className="h-3 w-3 shrink-0" />
                    <span>
                      {item.equipment_name} &times; {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:min-w-[150px]">
            {pickup.next_action === 'handover' ? (
              <Button
                size="sm"
                onClick={() => setHandoverTarget(pickup)}
                className="w-full"
              >
                Hand Over
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReturnTarget(pickup)}
                className="w-full"
              >
                Check In Return
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Depot — Self-pickup</h1>
          <p className="text-sm text-muted-foreground">
            Process equipment hand-overs and returns for self-pickup bookings.
          </p>
        </div>

        {/* Code lookup */}
        <Card className="mb-6 border border-border/60">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Search className="h-4 w-4" />
              Lookup by pickup code
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex gap-2">
              <Input
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                placeholder="Enter pickup code…"
                className="max-w-xs font-mono"
              />
              {codeFilter && (
                <Button variant="ghost" size="sm" onClick={() => setCodeFilter('')}>
                  Clear
                </Button>
              )}
            </div>
            {codeFilter && filteredPickups.length === 0 && !loading && (
              <p className="mt-2 text-sm text-muted-foreground">
                No active pickup found for code "{codeFilter}".
              </p>
            )}
          </CardContent>
        </Card>

        {/* Body */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Loading pickups…</div>
        ) : error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Could not load pickups</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => void fetchPickups()}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {codeFilter ? (
              /* filtered view */
              filteredPickups.length > 0 ? (
                filteredPickups.map(renderPickupCard)
              ) : null /* already shown above */
            ) : (
              /* full list */
              <>
                <p className="text-sm text-muted-foreground">
                  {pickups.length === 0
                    ? 'No active self-pickup bookings at this time.'
                    : `${pickups.length} active pickup${pickups.length === 1 ? '' : 's'}`}
                </p>
                {pickups.map(renderPickupCard)}
              </>
            )}
          </div>
        )}
      </main>

      {handoverTarget && (
        <HandoverDialog
          pickup={handoverTarget}
          open={Boolean(handoverTarget)}
          onClose={() => setHandoverTarget(null)}
          onCompleted={() => void handleActionCompleted()}
        />
      )}

      {returnTarget && (
        <ReturnDialog
          pickup={returnTarget}
          open={Boolean(returnTarget)}
          onClose={() => setReturnTarget(null)}
          onCompleted={() => void handleActionCompleted()}
        />
      )}
    </div>
  );
};

export default Depot;
