import { useState } from 'react';
import { Check, Loader2, Mail, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDateOnly } from '@/lib/dateOnly';
import type { WizardCartLine } from '@/components/staff/order-wizard/types';
import type { PosSaleResult } from '@/lib/queries/pos';

interface PosDoneProps {
  result: PosSaleResult;
  customerName: string;
  customerEmail: string;
  cart: WizardCartLine[];
  startDate: string;
  endDate: string;
  onNewSale: () => void;
}

/** Done screen: 80mm-friendly receipt (print CSS lives in src/index.css under
 * .pos-receipt) + "Email receipt" when an email exists, booking number and
 * pickup code. Reuses send-booking-confirmation (same mechanism the staff
 * Order Wizard fires after creating an order) rather than standing up a new
 * edge function — it already loads the full booking server-side from just
 * booking_id, which pos_create_sale's booking satisfies like any other. */
export function PosDone({ result, customerName, customerEmail, cart, startDate, endDate, onNewSale }: PosDoneProps) {
  const { toast } = useToast();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const canEmail = customerEmail.trim().length > 0;

  const handlePrint = () => window.print();

  const handleEmailReceipt = async () => {
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-booking-confirmation', {
        body: { booking_id: result.bookingId },
      });
      if (error) throw error;
      setEmailSent(true);
      toast({ title: 'Receipt emailed', description: `Sent to ${customerEmail}.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      toast({ title: 'Could not email the receipt', description: message, variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 text-emerald-700">
          <Check className="h-5 w-5" />
          <h3 className="text-base font-semibold">Sale complete</h3>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> Print receipt
          </Button>
          {canEmail && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleEmailReceipt()}
              disabled={sendingEmail || emailSent}
            >
              {sendingEmail ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              {emailSent ? 'Receipt emailed' : 'Email receipt'}
            </Button>
          )}
        </div>
      </div>

      <Card className="pos-receipt mx-auto max-w-sm border border-border/60">
        <CardContent className="space-y-3 p-5 text-sm">
          <div className="text-center">
            <p className="font-display text-base font-semibold">Travel Light Aruba</p>
            <p className="text-xs text-muted-foreground">Counter sale receipt</p>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Booking #</span>
            <span className="font-mono">{result.bookingId.slice(0, 8)}</span>
          </div>
          {result.pickupCode && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pickup code</span>
              <span className="font-mono font-semibold" data-testid="pos-receipt-pickup-code">
                {result.pickupCode}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span>{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dates</span>
            <span>
              {formatDateOnly(startDate)} – {formatDateOnly(endDate)}
            </span>
          </div>

          <div className="space-y-1 border-t border-dashed border-border/60 pt-2">
            {cart.map((line) => (
              <div key={line.item.id} className="flex justify-between">
                <span>
                  {line.item.name} × {line.quantity}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-dashed border-border/60 pt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold" data-testid="pos-receipt-total">
                ${result.total.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>${result.paid.toFixed(2)}</span>
            </div>
            {result.changeDue > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change given</span>
                <span>${result.changeDue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{result.paymentStatus}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center print:hidden">
        <Button type="button" onClick={onNewSale}>
          New sale
        </Button>
      </div>
    </div>
  );
}
