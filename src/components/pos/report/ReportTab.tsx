import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { fetchEndOfDayReport } from '@/lib/queries/posCloseOut';

/** Today's calendar day in Aruba (UTC-4, fixed offset, no DST — same rule
 * pos_end_of_day_report uses server-side), as 'YYYY-MM-DD'. Computed via UTC
 * methods on a shifted instant rather than the host's local timezone, since
 * the viewer's browser may not be on Aruba time. */
const arubaToday = (): string => {
  const aruba = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const y = aruba.getUTCFullYear();
  const m = String(aruba.getUTCMonth() + 1).padStart(2, '0');
  const d = String(aruba.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** POS phase 3 end-of-day report (contract: PLANS/TLB_POS_PHASE3_CONTRACT.md).
 * Date picker defaults to today in Aruba. By-method and by-staff tables,
 * drawer sessions opened that day, and a plain print button — no 80mm
 * receipt CSS here, this is a staff/accounting report, not a customer
 * receipt. */
export function ReportTab() {
  const [date, setDate] = useState(arubaToday);
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['pos-end-of-day-report', date],
    queryFn: () => fetchEndOfDayReport(date),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="space-y-1">
          <Label htmlFor="report-date">Date</Label>
          <Input
            id="report-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <Button type="button" variant="outline" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Loading report…</div>
      ) : error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-5">
            <p className="font-medium text-destructive">Could not load the report</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error.'}
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : report ? (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">By method</h3>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2 text-right">Count</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byMethod.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                        No payments.
                      </td>
                    </tr>
                  ) : (
                    report.byMethod.map((m) => (
                      <tr key={m.method} className="border-t border-border/60">
                        <td className="px-3 py-2 capitalize">{m.method}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{m.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${m.total.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">By staff</h3>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2 text-right">Sales</th>
                    <th className="px-3 py-2 text-right">Cash</th>
                    <th className="px-3 py-2 text-right">Card</th>
                    <th className="px-3 py-2 text-right">Other</th>
                    <th className="px-3 py-2 text-right">Credit notes</th>
                    <th className="px-3 py-2 text-right">Extensions</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                        No staff activity.
                      </td>
                    </tr>
                  ) : (
                    report.byStaff.map((s) => (
                      <tr key={s.staffId} className="border-t border-border/60">
                        <td className="px-3 py-2">{s.staffName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{s.salesCount}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${s.cash.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${s.card.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${s.other.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {s.creditNotesCount} / ${s.creditNotesTotal.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{s.extensionsCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Drawer sessions
            </h3>
            {report.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drawer sessions opened this day.</p>
            ) : (
              <div className="space-y-2">
                {report.sessions.map((s) => (
                  <Card key={s.id} className="border-border/60">
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                      <span className="capitalize">{s.status}</span>
                      <span>Float ${s.openingFloat.toFixed(2)}</span>
                      <span>{s.cashSales != null ? `Cash sales $${s.cashSales.toFixed(2)}` : 'Still open'}</span>
                      {s.variance != null && (
                        <span className={s.variance === 0 ? 'text-emerald-600' : 'text-destructive'}>
                          Variance ${s.variance.toFixed(2)}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3 text-sm font-medium">
            <span>Totals</span>
            <span>
              Payments ${report.totals.payments.toFixed(2)} · Credit notes ${report.totals.creditNotes.toFixed(2)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
