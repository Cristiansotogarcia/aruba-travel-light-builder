
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingSummaryProps {
  days: number;
  itemsCount: number;
  total: number;
  startDate: string;
  deliverySlot?: 'morning' | 'afternoon';
  pickupSlot?: 'morning' | 'afternoon';
}

export const BookingSummary = ({ 
  days, 
  itemsCount, 
  total, 
  startDate,
  deliverySlot,
  pickupSlot
}: BookingSummaryProps) => {
  // Check if it's Sunday
  const isSunday = startDate && new Date(startDate).getDay() === 0;
  
  // Calculate delivery fee
  const deliveryFee = isSunday ? 20 : (days < 5 ? 10 : 0);
  
  // Calculate equipment subtotal (total - delivery fee)
  const equipmentSubtotal = total - deliveryFee;
  
  // Check if extra day was added due to time slot mismatch
  const hasTimeSlotAdjustment = deliverySlot === 'morning' && pickupSlot === 'afternoon';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Rental Period:</span>
            <span className="font-medium">{days} days</span>
          </div>
          
          {hasTimeSlotAdjustment && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>Time Slot Adjustment:</span>
              <span>+1 day (afternoon pickup)</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Equipment Items:</span>
            <span className="font-medium">{itemsCount}</span>
          </div>
          
          <div className="border-t pt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Equipment Subtotal:</span>
              <span className="font-medium">${equipmentSubtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>
                {isSunday ? 'Sunday Delivery Fee:' : 
                 days < 5 ? 'Delivery Fee:' : 
                 'Delivery Fee (Weekly):'}
              </span>
              <span className="font-medium">
                {deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : 'FREE'}
              </span>
            </div>
          </div>
          
          <div className="border-t pt-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Amount:</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
          
          {isSunday && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              * Sunday delivery fee applied
            </div>
          )}
          
          {days >= 5 && !isSunday && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              Γ£ô Weekly rental - Free delivery included!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
