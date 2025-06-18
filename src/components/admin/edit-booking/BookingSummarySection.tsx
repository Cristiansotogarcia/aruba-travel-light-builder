
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookingItem } from '@/components/admin/calendar/types';

interface BookingSummarySectionProps {
  startDate: string;
  endDate: string;
  bookingItems: BookingItem[];
  discount: number;
  loading: boolean;
  isUndeliverable: boolean;
  onDiscountChange: (discount: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const BookingSummarySection = ({
  startDate,
  endDate,
  bookingItems,
  discount,
  loading,
  isUndeliverable,
  onDiscountChange,
  onSubmit,
  onCancel
}: BookingSummarySectionProps) => {
  const calculateSubtotal = () => {
    return bookingItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - discount;
  };

  return (
    <div className="space-y-3">
      {/* Discount */}
      <div className="space-y-2">
        <Label htmlFor="discount" className="text-xs">Discount ($)</Label>
        <Input
          id="discount"
          type="number"
          min="0"
          max={calculateSubtotal()}
          value={discount}
          onChange={(e) => onDiscountChange(Math.max(0, Math.min(calculateSubtotal(), Number(e.target.value))))}
          className="h-8"
        />
      </div>

      {/* Total Calculation */}
      {startDate && endDate && bookingItems.length > 0 && (
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${calculateSubtotal().toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-1">
            <span>Total:</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={loading} className="flex-1">
          {loading ? 'Updating...' : (isUndeliverable ? 'Reschedule' : 'Update')}
        </Button>
      </div>
    </div>
  );
};
