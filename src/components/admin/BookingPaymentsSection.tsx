import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import {
  useBookingPayments,
  useRecordBookingPayment,
  useDeleteBookingPayment,
} from '@/hooks/useBookingPayments';
import {
  PAYMENT_METHODS,
  derivePaymentStatus,
  outstandingBalance,
  sumPayments,
  type PaymentMethod,
} from '@/lib/payments';
import {
  getPaymentStatusColor,
  getPaymentStatusLabel,
} from './calendar/statusUtils';
import { Booking } from './calendar/types';
import Spinner from '@/components/common/Spinner';

interface BookingPaymentsSectionProps {
  booking: Booking;
}

const methodLabel = (method: string) =>
  PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;

export const BookingPaymentsSection = ({ booking }: BookingPaymentsSectionProps) => {
  const { profile } = useAuth();
  const canDelete = profile?.role === 'SuperUser' || profile?.role === 'Admin';

  const { data: payments = [], isLoading } = useBookingPayments(booking.id);
  const recordPayment = useRecordBookingPayment();
  const deletePayment = useDeleteBookingPayment(booking.id);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const totalAmount = Number(booking.total_amount) || 0;
  const totalPaid = sumPayments(payments);
  const outstanding = outstandingBalance(totalPaid, totalAmount);
  // Derive from the live payments list so the badge is fresh even before the
  // parent's booking object is refetched.
  const derivedStatus =
    payments.length > 0 || totalPaid > 0
      ? derivePaymentStatus(totalPaid, totalAmount)
      : (booking.payment_status ?? 'pending');

  const parsedAmount = Number.parseFloat(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const resetForm = () => {
    setAmount('');
    setMethod('bank_transfer');
    setReference('');
    setNote('');
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!amountValid) return;
    recordPayment.mutate(
      {
        bookingId: booking.id,
        amount: Math.round(parsedAmount * 100) / 100,
        method,
        reference: reference.trim() || null,
        note: note.trim() || null,
      },
      { onSuccess: resetForm },
    );
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </h3>
          <Badge className={getPaymentStatusColor(derivedStatus)}>
            {getPaymentStatusLabel(derivedStatus)}
          </Badge>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500">Total</div>
            <div className="font-bold">${totalAmount.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500">Paid</div>
            <div className="font-bold text-green-700">${totalPaid.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500">Outstanding</div>
            <div className={`font-bold ${outstanding > 0 ? 'text-red-700' : 'text-gray-900'}`}>
              ${outstanding.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Recorded payments */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" message="Loading payments..." />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    ${Number(payment.amount).toFixed(2)}
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      {methodLabel(payment.method)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                    {payment.reference && <> · Ref: {payment.reference}</>}
                  </div>
                  {payment.note && (
                    <div className="text-xs text-gray-500 truncate">{payment.note}</div>
                  )}
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Remove payment"
                    disabled={deletePayment.isPending}
                    onClick={() => deletePayment.mutate(payment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add payment */}
        {showForm ? (
          <div className="space-y-3 border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="payment-amount">Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="payment-method">Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger id="payment-method" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="payment-reference">Reference (optional)</Label>
              <Input
                id="payment-reference"
                placeholder="Bank / transaction reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="payment-note">Note (optional)</Label>
              <Input
                id="payment-note"
                placeholder="Internal note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!amountValid || recordPayment.isPending}
                onClick={handleSubmit}
              >
                {recordPayment.isPending ? 'Saving...' : 'Save payment'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add payment
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
