import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Printer, Unlock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  closeDrawer,
  fetchDrawerCashSoFar,
  fetchOpenDrawerSession,
  openDrawer,
  type DrawerSessionRecord,
} from '@/lib/queries/posCloseOut';
import { canCloseDrawer, computeExpectedCash, computeVariance } from '@/lib/pos/closeOut';
import { formatDateOnly } from '@/lib/dateOnly';

const SESSION_QUERY_KEY = ['pos-drawer-session'];
const CASH_SO_FAR_QUERY_KEY = ['pos-drawer-cash-so-far'];

/** POS phase 3 Drawer tab (contract: PLANS/TLB_POS_PHASE3_CONTRACT.md).
 * No open drawer -> an "Open drawer" form (float required >= 0, optional
 * note). Open drawer -> status card (opened by/at, float, live cash sales so
 * far / expected from pos_drawer_cash_so_far) plus a "Close drawer" form
 * (counted cash, live variance, note required only when variance != 0).
 * After close -> a print-friendly summary card, same .pos-receipt CSS the
 * Sale tab's Done screen uses (80mm friendly). */
export function DrawerTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sessionQuery = useQuery({ queryKey: SESSION_QUERY_KEY, queryFn: fetchOpenDrawerSession });
  const cashSoFarQuery = useQuery({
    queryKey: CASH_SO_FAR_QUERY_KEY,
    queryFn: fetchDrawerCashSoFar,
    enabled: !!sessionQuery.data,
    refetchInterval: sessionQuery.data ? 30_000 : false,
  });

  const [openingFloat, setOpeningFloat] = useState<number | ''>('');
  const [openNote, setOpenNote] = useState('');
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const [countedCash, setCountedCash] = useState<number | ''>('');
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closedSummary, setClosedSummary] = useState<DrawerSessionRecord | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: CASH_SO_FAR_QUERY_KEY });
  };

  const handleOpen = async () => {
    const floatValue = typeof openingFloat === 'number' ? openingFloat : Number.NaN;
    if (!Number.isFinite(floatValue) || floatValue < 0) {
      setOpenError('Enter an opening float of zero or more.');
      return;
    }
    setOpening(true);
    setOpenError(null);
    try {
      await openDrawer(floatValue, openNote);
      setOpeningFloat('');
      setOpenNote('');
      invalidate();
      toast({ title: 'Drawer opened' });
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Could not open the drawer.');
    } finally {
      setOpening(false);
    }
  };

  const session = sessionQuery.data;
  const cashSoFar = cashSoFarQuery.data;
  const expected = session && cashSoFar ? computeExpectedCash(session.openingFloat, cashSoFar.cashSales) : null;
  const countedValue = typeof countedCash === 'number' ? countedCash : Number.NaN;
  const variance = expected != null ? computeVariance(countedValue, expected) : 0;
  const closeEnabled =
    expected != null && canCloseDrawer({ counted: countedValue, variance, note: closeNote });

  const handleClose = async () => {
    if (!session || expected == null) return;
    if (!canCloseDrawer({ counted: countedValue, variance, note: closeNote })) {
      setCloseError('Enter counted cash; a note is required when it does not match expected.');
      return;
    }
    setClosing(true);
    setCloseError(null);
    try {
      const closed = await closeDrawer(session.id, countedValue, closeNote);
      setClosedSummary(closed);
      setCountedCash('');
      setCloseNote('');
      invalidate();
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : 'Could not close the drawer.');
    } finally {
      setClosing(false);
    }
  };

  if (sessionQuery.isLoading) {
    return <div className="py-16 text-center text-muted-foreground">Loading drawer status…</div>;
  }

  if (closedSummary) {
    const variance2 = closedSummary.variance ?? 0;
    return (
      <div className="space-y-6">
        <Card className="pos-receipt mx-auto max-w-sm border border-border/60">
          <CardContent className="space-y-3 p-5 text-sm">
            <div className="text-center">
              <p className="font-display text-base font-semibold">Travel Light Aruba</p>
              <p className="text-xs text-muted-foreground">Drawer close-out</p>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Closed at</span>
              <span>{closedSummary.closedAt ? formatDateOnly(closedSummary.closedAt) : '—'}</span>
            </div>
            <div className="space-y-1 border-t border-dashed border-border/60 pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening float</span>
                <span>${closedSummary.openingFloat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash sales</span>
                <span data-testid="pos-close-summary-cash-sales">${(closedSummary.cashSales ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected cash</span>
                <span>${(closedSummary.expectedCash ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Counted cash</span>
                <span>${(closedSummary.countedCash ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Variance</span>
                <span className={cn(variance2 === 0 ? 'text-emerald-600' : 'text-destructive')}>
                  ${variance2.toFixed(2)}
                </span>
              </div>
            </div>
            {closedSummary.closeNote && (
              <div className="border-t border-dashed border-border/60 pt-2 text-xs text-muted-foreground">
                Note: {closedSummary.closeNote}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex justify-center gap-2 print:hidden">
          <Button type="button" variant="outline" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button type="button" onClick={() => setClosedSummary(null)}>
            Open a new drawer
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Card className="border-border/60">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Unlock className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-foreground">No drawer open</h3>
            </div>
            <div className="space-y-1">
              <Label htmlFor="drawer-opening-float">Opening float</Label>
              <Input
                id="drawer-opening-float"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.valueAsNumber)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="drawer-open-note">Note (optional)</Label>
              <Textarea id="drawer-open-note" value={openNote} onChange={(e) => setOpenNote(e.target.value)} rows={2} />
            </div>
            {openError && <p className="text-sm text-destructive">{openError}</p>}
            <Button
              type="button"
              className="w-full"
              disabled={opening}
              onClick={() => void handleOpen()}
              data-testid="pos-drawer-open"
            >
              {opening ? 'Opening…' : 'Open drawer'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="border-border/60">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-emerald-700">
            <Lock className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Drawer open</h3>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opened by</span>
              <span>{session.openedByName ?? session.openedBy.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opened at</span>
              <span>
                {formatDateOnly(session.openedAt, undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Float</span>
              <span>${session.openingFloat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cash sales so far</span>
              <span data-testid="pos-drawer-cash-so-far">
                {cashSoFar ? `$${cashSoFar.cashSales.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Expected cash</span>
              <span>{expected != null ? `$${expected.toFixed(2)}` : '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">Close drawer</h3>
          <div className="space-y-1">
            <Label htmlFor="drawer-counted-cash">Counted cash</Label>
            <Input
              id="drawer-counted-cash"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.valueAsNumber)}
            />
          </div>
          {expected != null && Number.isFinite(countedValue) && (
            <div
              className={cn(
                'rounded-lg px-3 py-2 text-center text-sm font-semibold',
                variance === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-destructive/10 text-destructive',
              )}
              data-testid="pos-drawer-variance"
            >
              Variance: ${variance.toFixed(2)}
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="drawer-close-note">Note {variance !== 0 ? '(required)' : '(optional)'}</Label>
            <Textarea id="drawer-close-note" value={closeNote} onChange={(e) => setCloseNote(e.target.value)} rows={2} />
          </div>
          {closeError && <p className="text-sm text-destructive">{closeError}</p>}
          <Button
            type="button"
            className="w-full"
            disabled={!closeEnabled || closing}
            onClick={() => void handleClose()}
            data-testid="pos-drawer-close"
          >
            {closing ? 'Closing…' : 'Close drawer'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
