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
import QrScanner from '@/components/depot/QrScanner';
import type { DepotPickup } from '@/components/depot/HandoverDialog';
import { Package, Phone, Calendar, Search, AlertCircle, QrCode, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useDepotSync } from '@/hooks/useDepotSync';
import { cachePickups, getCachedPickups } from '@/lib/offline/depotDb';

const Depot = () => {
  const [pickups, setPickups] = useState<DepotPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [codeFilter, setCodeFilter] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<DepotPickup | null>(null);
  const [returnTarget, setReturnTarget] = useState<DepotPickup | null>(null);
  const { toast } = useToast();

  const isOnline = useOnlineStatus();
  const { pendingCount, syncNow, refreshCount } = useDepotSync();

  const fetchPickups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase as any).rpc('get_depot_pickups');
      if (rpcError) {
        throw rpcError;
      }
      const rows = (data as DepotPickup[]) ?? [];
      setPickups(rows);
      setFromCache(false);
      // Persist to IndexedDB so the offline path can read it later.
      void cachePickups(rows);
      return;
    } catch (err) {
      // Network error or RPC error — fall back to the local cache.
      const cached = await getCachedPickups();
      if (cached.length > 0) {
        setPickups(cached);
        setFromCache(true);
        setError(null);
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load depot pickups.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPickups();
  }, [fetchPickups]);

  // Re-fetch when we come back online.
  useEffect(() => {
    if (isOnline) {
      void fetchPickups();
    }
  }, [isOnline, fetchPickups]);

  const filteredPickups = useMemo(() => {
    const q = codeFilter.trim().toLowerCase();
    if (!q) return pickups;
    return pickups.filter((p) => p.pickup_code.toLowerCase().includes(q));
  }, [codeFilter, pickups]);

  const handleActionCompleted = useCallback(async () => {
    await refreshCount();
    if (isOnline) {
      toast({ title: 'Refreshing…' });
      await fetchPickups();
    }
  }, [fetchPickups, isOnline, refreshCount, toast]);

  const handleQrScan = useCallback(
    (text: string) => {
      const code = text.trim().toUpperCase();
      setCodeFilter(code);
      const match = pickups.find(
        (p) => p.pickup_code.toUpperCase() === code,
      );
      if (!match) {
        toast({
          title: `No active pickup found for ${code}`,
          variant: 'destructive',
        });
      }
    },
    [pickups, toast],
  );

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

  const showOfflineBanner = !isOnline || pendingCount > 0;

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

        {/* Offline / pending-actions banner */}
        {showOfflineBanner && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              {!isOnline && pendingCount > 0
                ? `Offline — ${pendingCount} action${pendingCount === 1 ? '' : 's'} queued, will sync when back online.`
                : !isOnline
                ? 'Offline — showing cached pickups.'
                : `${pendingCount} action${pendingCount === 1 ? '' : 's'} queued — syncing…`}
            </span>
            {isOnline && pendingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                onClick={() => void syncNow()}
              >
                Sync now
              </Button>
            )}
          </div>
        )}

        {/* Cached data notice */}
        {fromCache && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
            Showing cached pickups from the last successful load.
          </div>
        )}

        {/* Code lookup */}
        <Card className="mb-6 border border-border/60">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Search className="h-4 w-4" />
              Lookup by pickup code
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              <Input
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                placeholder="Enter pickup code…"
                className="max-w-xs font-mono"
              />
              {!showScanner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-1.5"
                >
                  <QrCode className="h-4 w-4" />
                  Scan QR
                </Button>
              )}
              {codeFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCodeFilter('')}
                >
                  Clear
                </Button>
              )}
            </div>

            {showScanner && (
              <QrScanner
                onScan={handleQrScan}
                onClose={() => setShowScanner(false)}
              />
            )}

            {codeFilter && filteredPickups.length === 0 && !loading && (
              <p className="mt-2 text-sm text-muted-foreground">
                No active pickup found for code &ldquo;{codeFilter}&rdquo;.
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
