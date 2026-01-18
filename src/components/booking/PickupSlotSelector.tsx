import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

interface PickupSlotSelectorProps {
  selectedDate: string;
  selectedSlot?: 'morning' | 'afternoon';
  onSlotChange: (slot: 'morning' | 'afternoon') => void;
  disabled?: boolean;
}

interface SlotInfo {
  slot: 'morning' | 'afternoon';
  label: string;
  time: string;
}

export const PickupSlotSelector = ({
  selectedDate,
  selectedSlot,
  onSlotChange,
  disabled = false
}: PickupSlotSelectorProps) => {
  // Check if selected date is Sunday
  const isSunday = selectedDate && new Date(selectedDate).getDay() === 0;

  const slots: SlotInfo[] = [
    { slot: 'morning', label: 'Morning', time: '8:00 AM - 10:00 AM' },
    { slot: 'afternoon', label: 'Afternoon', time: '4:00 PM - 6:00 PM' }
  ];

  useEffect(() => {
    // If it's Sunday and afternoon is selected, auto-switch to morning
    if (isSunday && selectedSlot === 'afternoon') {
      onSlotChange('morning');
    }
  }, [selectedDate, isSunday, selectedSlot, onSlotChange]);

  if (!selectedDate) {
    return (
      <div className="space-y-2">
        <Label className="text-base font-semibold">Pickup Time Slot</Label>
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Please select a pickup date first to view available time slots.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Pickup Time Slot *</Label>
        <p className="text-sm text-gray-600 mt-1">
          Choose your preferred pickup time for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {isSunday && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Sunday Pickup:</strong> Sunday pickups are limited to the morning time slot.
          </AlertDescription>
        </Alert>
      )}

      <RadioGroup
        value={selectedSlot ?? ''}
        onValueChange={(value) => {
          if (value === 'morning' || value === 'afternoon') {
            onSlotChange(value);
          }
        }}
        disabled={Boolean(disabled)}
        className="space-y-3"
      >
        {slots.map((slot) => {
          // On Sunday, disable afternoon slot
          const isSundayAfternoonSlot = isSunday && slot.slot === 'afternoon';
          const isSlotDisabled = disabled || isSundayAfternoonSlot;
          
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
                id={`pickup-${slot.slot}`}
                disabled={Boolean(isSlotDisabled)}
                className="mt-1"
              />
              <Label
                htmlFor={`pickup-${slot.slot}`}
                className={`flex-1 cursor-pointer ${
                  isSlotDisabled ? 'cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-base">{slot.label}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-1.5" />
                  {slot.time}
                </div>
                {isSundayAfternoonSlot && (
                  <p className="text-sm text-blue-600 mt-2">
                    Not available on Sundays. Please select morning pickup.
                  </p>
                )}
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> If you select afternoon pickup after morning delivery, an additional day will be charged.
        </AlertDescription>
      </Alert>
    </div>
  );
};
