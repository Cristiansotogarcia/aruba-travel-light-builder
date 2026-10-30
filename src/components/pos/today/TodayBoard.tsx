import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Package, Phone, RefreshCw } from 'lucide-react';

import { fetchPosTodayBoard } from '@/lib/queries/posToday';
import {
  groupTodayBoard,
  availableActions,
  TODAY_BOARD_BUCKET_LABELS,
  type TodayBoardBooking,
  type TodayBoardBucketId,
} from '@/lib/pos/todayBoard';
import { todayDateOnly, formatDateOnly } from '@/lib/dateOnly';

import { HandoverDialog } from '@/components/depot/HandoverDialog';
import { ReturnDialog } from '@/components/depot/ReturnDialog';
import type { DepotPickup } from '@/components/depot/HandoverDialog';
import { ExtendRentalDialog } from './ExtendRentalDialog';
import { RefundDialog } from './RefundDialog';

const QUERY_KEY = ['pos-today-board'];

const BUCKET_ORDER: TodayBoardBucketId[] = ['storePickups', 'storeReturns', 'deliveriesOut', 'collectionsIn'];

const toDepotPickup = (booking: TodayBoardBooking, nextAction: 'handover' | 'return'): DepotPickup => ({
  booking_id: booking.booking_id,
  pickup_code: booking.pickup_code ?? '',
  customer_name: booking.customer_name,
  customer_phone: booking.customer_phone,
  start_date: booking.start_date,
  end_date: booking.end_date,
  status: booking.status,
  items: booking.items,
  next_action: nextAction,
});

/** POS phase 2 Today board (plan: PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md
 * lines 49-62). Fetches get_pos_today_board once, groups it client-side into
 * the four buckets, and offers hand-over / return / extend / refund per row
 * as applicable (availableActions). */
export const TodayBoard = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPosTodayBoard,
  });

  const [handoverTarget, setHandoverTarget] = useState<TodayBoardBooking | null>(null);
  const [returnTarget, setReturnTarget] = useState<TodayBoardBooking | null>(null);
  const [extendTarget, setExtendTarget] = useState<TodayBoardBooking | null>(null);
  const [refundTarget, setRefundTarget] = useState<TodayBoardBooking | null>(null);

  const board = groupTodayBoard(data ?? [], todayDateOnly());

  const handleActionCompleted = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const renderRow = (booking: TodayBoardBooking, bucket: TodayBoardBucketId) => {
    const actions = availableActions(bucket);
    return (
      <Card key={`${bucket}-${booking.booking_id}`} className="border border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">{booking.customer_name}</h4>
                {booking.pickup_code && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {booking.pickup_code}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  {booking.customer_phone}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {formatDateOnly(booking.start_date)} – {formatDateOnly(booking.end_date)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {booking.items.map((item, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-xs"
                  >
                    <Package className="h-3 w-3 shrink-0" />
                    {item.equipment_name} &times; {item.quantity}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              {actions.includes('handover') && (
                <Button size="sm" onClick={() => setHandoverTarget(booking)}>
                  Hand Over
                </Button>
              )}
              {actions.includes('return') && (
                <Button size="sm" variant="outline" onClick={() => setReturnTarget(booking)}>
                  Check In Return
                </Button>
              )}
              {actions.includes('extend') && (
                <Button size="sm" variant="outline" onClick={() => setExtendTarget(booking)}>
                  Extend
                </Button>
              )}
              {actions.includes('refund') && (
                <Button size="sm" variant="ghost" onClick={() => setRefundTarget(booking)}>
                  Refund
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSection = (bucket: TodayBoardBucketId) => {
    const rows = board[bucket];
    return (
      <div key={bucket} className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {TODAY_BOARD_BUCKET_LABELS[bucket]}
          </h3>
          <Badge variant="outline" className="text-xs">
            {rows.length}
          </Badge>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing due.</p>
        ) : (
          <div className="space-y-2">{rows.map((booking) => renderRow(booking, bucket))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {formatDateOnly(todayDateOnly(), undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
        <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Loading today&apos;s board…</div>
      ) : error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Could not load the Today board</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error.'}
              </p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">{BUCKET_ORDER.map(renderSection)}</div>
      )}

      {handoverTarget && (
        <HandoverDialog
          pickup={toDepotPickup(handoverTarget, 'handover')}
          open={Boolean(handoverTarget)}
          onClose={() => setHandoverTarget(null)}
          onCompleted={handleActionCompleted}
        />
      )}

      {returnTarget && (
        <ReturnDialog
          pickup={toDepotPickup(returnTarget, 'return')}
          open={Boolean(returnTarget)}
          onClose={() => setReturnTarget(null)}
          onCompleted={handleActionCompleted}
        />
      )}

      {extendTarget && (
        <ExtendRentalDialog
          booking={extendTarget}
          open={Boolean(extendTarget)}
          onClose={() => setExtendTarget(null)}
          onCompleted={handleActionCompleted}
        />
      )}

      {refundTarget && (
        <RefundDialog
          booking={refundTarget}
          open={Boolean(refundTarget)}
          onClose={() => setRefundTarget(null)}
          onCompleted={handleActionCompleted}
        />
      )}
    </div>
  );
};
