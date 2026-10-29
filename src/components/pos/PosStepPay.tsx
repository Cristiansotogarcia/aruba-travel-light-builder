import { Banknote, CreditCard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  changeDue,
  isPayNowEnabled,
  validatePaymentSet,
  type PosPaymentLine,
  type PosPaymentMethod,
} from '@/lib/pos/posPayments';

interface PosStepPayProps {
  /** computeBookingTotals preview — the server confirms the real total when
   * the sale is charged (see PosWizard / pos.ts for why there is no
   * authoritative total to show before that point). */
  estimatedTotal: number;
  lines: PosPaymentLine[];
  onLinesChange: (lines: PosPaymentLine[]) => void;
  onCharge: () => void;
  onPayLater: () => void;
  submitting: boolean;
  errorMessage: string | null;
}

const METHOD_LABEL: Record<PosPaymentMethod, string> = { cash: 'Cash', card: 'Card', other: 'Other' };

/** Screen 3: cash (tendered -> big change due), card (amount + reference),
 * split payments, or Pay later (0 payments, status pending). */
export function PosStepPay({
  estimatedTotal,
  lines,
  onLinesChange,
  onCharge,
  onPayLater,
  submitting,
  errorMessage,
}: PosStepPayProps) {
  const validation = validatePaymentSet(lines, estimatedTotal);
  const payNowEnabled = isPayNowEnabled(lines, estimatedTotal) && !submitting;

  const updateLine = (index: number, patch: Partial<PosPaymentLine>) => {
    onLinesChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };
  const removeLine = (index: number) => onLinesChange(lines.filter((_, i) => i !== index));
  const addLine = (method: PosPaymentMethod) => {
    const remaining = Math.max(0, estimatedTotal - validation.totalApplied);
    onLinesChange([...lines, { method, amount: remaining > 0 ? remaining : 0 }]);
  };

  const errorFor = (index: number) => validation.errors.find((e) => e.index === index)?.message ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Pay</h3>
        <p className="text-sm text-muted-foreground">
          Estimated total — the server confirms the final total when you charge.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <span className="text-sm font-medium text-muted-foreground">Estimated total</span>
          <span className="text-2xl font-semibold tabular-nums" data-testid="pos-pay-estimated-total">
            ${estimatedTotal.toFixed(2)}
          </span>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const lineError = errorFor(index);
          const due = line.method === 'cash' ? changeDue(line.amount, line.tendered) : 0;
          return (
            <Card key={index} className={cn('border-border/60', lineError && 'border-destructive/50')}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {(['cash', 'card', 'other'] as PosPaymentMethod[]).map((m) => (
                      <Button
                        key={m}
                        type="button"
                        size="sm"
                        variant={line.method === m ? 'default' : 'outline'}
                        onClick={() =>
                          updateLine(index, {
                            method: m,
                            reference: m === 'card' ? line.reference : undefined,
                            tendered: m === 'cash' ? line.tendered : null,
                          })
                        }
                      >
                        {METHOD_LABEL[m]}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeLine(index)}
                    aria-label="Remove payment line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`pos-pay-amount-${index}`}>Amount</Label>
                    <Input
                      id={`pos-pay-amount-${index}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={Number.isFinite(line.amount) ? line.amount : ''}
                      onChange={(e) => updateLine(index, { amount: e.target.valueAsNumber })}
                    />
                  </div>
                  {line.method === 'card' ? (
                    <div className="space-y-1">
                      <Label htmlFor={`pos-pay-reference-${index}`}>Reference</Label>
                      <Input
                        id={`pos-pay-reference-${index}`}
                        value={line.reference ?? ''}
                        onChange={(e) => updateLine(index, { reference: e.target.value })}
                        placeholder="Last 4 or terminal slip no."
                      />
                    </div>
                  ) : line.method === 'cash' ? (
                    <div className="space-y-1">
                      <Label htmlFor={`pos-pay-tendered-${index}`}>Cash tendered</Label>
                      <Input
                        id={`pos-pay-tendered-${index}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={line.tendered ?? ''}
                        onChange={(e) => updateLine(index, { tendered: e.target.valueAsNumber })}
                      />
                    </div>
                  ) : null}
                </div>

                {line.method === 'cash' && (
                  <div
                    className={cn(
                      'rounded-lg px-3 py-3 text-center',
                      due > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <p className="text-xs uppercase tracking-wide">Change due</p>
                    <p className="text-3xl font-bold tabular-nums" data-testid={`pos-change-due-${index}`}>
                      ${due.toFixed(2)}
                    </p>
                  </div>
                )}

                {lineError && <p className="text-sm text-destructive">{lineError}</p>}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addLine('cash')}>
            <Banknote className="h-3.5 w-3.5" /> Add cash
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addLine('card')}>
            <CreditCard className="h-3.5 w-3.5" /> Add card
          </Button>
        </div>
      </div>

      {lines.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
          <span>Remaining</span>
          <span className="font-medium tabular-nums">${validation.remaining.toFixed(2)}</span>
        </div>
      )}

      {validation.overpaid && (
        <p className="text-sm text-destructive">Payments exceed the estimated total. Remove or reduce a line.</p>
      )}

      {errorMessage && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1"
          disabled={!payNowEnabled}
          onClick={onCharge}
          data-testid="pos-pay-charge"
        >
          {submitting ? 'Charging…' : 'Charge'}
        </Button>
        <Button type="button" variant="outline" className="flex-1" disabled={submitting} onClick={onPayLater}>
          Pay later
        </Button>
      </div>
    </div>
  );
}
