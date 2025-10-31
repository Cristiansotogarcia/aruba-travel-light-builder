
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingSummaryProps {
  days: number;
  itemsCount: number;
  total: number;
}

export const BookingSummary = ({ days, itemsCount, total }: BookingSummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Rental Period:</span>
            <span>{days} days</span>
          </div>
          <div className="flex justify-between">
            <span>Equipment Items:</span>
            <span>{itemsCount}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
