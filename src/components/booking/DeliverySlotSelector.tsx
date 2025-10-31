import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DeliverySlotSelectorProps {
  selectedDate: string;
  selectedSlot?: 'morning' | 'afternoon';
  onSlotChange: (slot: 'morning' | 'afternoon') => void;
  disabled?: boolean;
}

interface SlotAvailability {
  slot: 'morning' | 'afternoon';
  label: string;
  time: string;
  available: boolean;
  remaining: number;
  total: number;
}

export const DeliverySlotSelector = ({
  selectedDate,
  selectedSlot,
  onSlotChange,
  disabled = false
}: DeliverySlotSelectorProps) => {
  const [slots, setSlots] = useState<SlotAvailability[]>([
    { slot: 'morning', label: 'Morning', time: '9:00 AM - 12:00 PM', available: true, remaining: 3, total: 3 },
    { slot: 'afternoon', label: 'Afternoon', time: '1:00 PM - 5:00 PM', available: true, remaining: 3, total: 3 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if selected date is Sunday
  const isSunday = selectedDate && new Date(selectedDate).getDay() === 0;

  useEffect(() => {
    if (selectedDate) {
      checkSlotAvailability();
      
      // If it's Sunday and morning is selected, auto-switch to afternoon
      if (isSunday && selectedSlot === 'morning') {
        onSlotChange('afternoon');
      }
    }
  }, [selectedDate]);

  const checkSlotAvailability = async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      // Check morning slot
      const { data: morningData, error: morningError } = await supabase
        .rpc('check_delivery_slot_availability' as any, {
          p_delivery_date: selectedDate,
          p_time_slot: 'morning'
        });

      // Check afternoon slot
      const { data: afternoonData, error: afternoonError } = await supabase
        .rpc('check_delivery_slot_availability' as any, {
          p_delivery_date: selectedDate,
          p_time_slot: 'afternoon'
        });

      if (morningError || afternoonError) {
        throw new Error('Failed to check slot availability');
      }

      // Update slots with availability data
      const morningSlot = Array.isArray(morningData) ? morningData[0] : morningData;
      const afternoonSlot = Array.isArray(afternoonData) ? afternoonData[0] : afternoonData;

      setSlots([
        {
          slot: 'morning',
          label: 'Morning',
          time: '9:00 AM - 12:00 PM',
          available: morningSlot?.available ?? true,
          remaining: morningSlot?.remaining_slots ?? 3,
          total: morningSlot?.max_bookings ?? 3
        },
        {
          slot: 'afternoon',
          label: 'Afternoon',
          time: '1:00 PM - 5:00 PM',
          available: afternoonSlot?.available ?? true,
          remaining: afternoonSlot?.remaining_slots ?? 3,
          total: afternoonSlot?.max_bookings ?? 3
        }
      ]);

      // If selected slot is now full, clear selection
      if (selectedSlot === 'morning' && !morningSlot?.available) {
        onSlotChange('afternoon');
      } else if (selectedSlot === 'afternoon' && !afternoonSlot?.available) {
        onSlotChange('morning');
      }

    } catch (err) {
      console.error('Error checking slot availability:', err);
      setError('Unable to check delivery slot availability. Please try again.');
      // Set default availability on error
      setSlots([
        { slot: 'morning', label: 'Morning', time: '9:00 AM - 12:00 PM', available: true, remaining: 3, total: 3 },
        { slot: 'afternoon', label: 'Afternoon', time: '1:00 PM - 5:00 PM', available: true, remaining: 3, total: 3 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityBadge = (slot: SlotAvailability) => {
    if (!slot.available) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          Full
        </span>
      );
    }
    
    if (slot.remaining <= 1) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          {slot.remaining} slot left
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        {slot.remaining} slots available
      </span>
    );
  };

  if (!selectedDate) {
    return (
      <div className="space-y-2">
        <Label className="text-base font-semibold">Delivery Time Slot</Label>
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Please select a delivery date first to view available time slots.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Delivery Time Slot *</Label>
        <p className="text-sm text-gray-600 mt-1">
          Choose your preferred delivery time for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSunday && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Sunday Delivery:</strong> Only afternoon deliveries (4:00 PM - 6:00 PM) are available on Sundays.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">Checking availability...</span>
        </div>
      ) : (
        <RadioGroup
          value={selectedSlot}
          onValueChange={(value) => onSlotChange(value as 'morning' | 'afternoon')}
          disabled={disabled || false}
          className="space-y-3"
        >
          {slots.map((slot) => {
            // On Sunday, disable morning slot
            const isSundayMorningSlot = isSunday && slot.slot === 'morning';
            const isSlotDisabled = !slot.available || disabled || isSundayMorningSlot;
            
            return (
              <div
                key={slot.slot}
                className={`relative flex items-start space-x-3 rounded-lg border p-4 transition-all ${
                  selectedSlot === slot.slot
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-gray-200 hover:border-gray-300'
                } ${
                  isSlotDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
              >
                <RadioGroupItem
                  value={slot.slot}
                  id={slot.slot}
                  disabled={Boolean(isSlotDisabled)}
                  className="mt-1"
                />
                <Label
                  htmlFor={slot.slot}
                  className={`flex-1 cursor-pointer ${
                    isSlotDisabled ? 'cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-base">{slot.label}</span>
                    {getAvailabilityBadge(slot)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1.5" />
                    {slot.time}
                  </div>
                  {!slot.available && !isSundayMorningSlot && (
                    <p className="text-sm text-red-600 mt-2">
                      This time slot is fully booked. Please select another slot or different date.
                    </p>
                  )}
                  {isSundayMorningSlot && (
                    <p className="text-sm text-blue-600 mt-2">
                      Not available on Sundays. Please select afternoon delivery.
                    </p>
                  )}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          We can accommodate up to 3 deliveries per time slot. Slots are reserved on a first-come, first-served basis.
        </AlertDescription>
      </Alert>
    </div>
  );
};
