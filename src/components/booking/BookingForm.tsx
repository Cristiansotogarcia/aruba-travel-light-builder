import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateSelection } from './DateSelection';
import EquipmentSelection from './EquipmentSelection';
import { DeliverySlotSelector } from './DeliverySlotSelector';
import { PickupSlotSelector } from './PickupSlotSelector';
import { CustomerInformation } from './CustomerInformation';
import { BookingSummary } from './BookingSummary';
import useBooking from '@/hooks/useBooking';
import { useCart } from '@/hooks/useCart';
import { AlertCircle, Loader2, Calendar } from 'lucide-react';

interface FormValidationErrors {
  dates?: string;
  deliverySlot?: string;
  pickupSlot?: string;
  equipment?: string;
  customer?: string;
  general?: string;
  sunday?: string;
}

export const BookingForm = () => {
  const {
    bookingData,
    products,
    selectedEquipment,
    quantity,
    isSubmitting,
    setSelectedEquipment,
    setQuantity,
    updateCustomerInfo,
    updateDates,
    calculateDays,
    calculateTotal,
    submitBooking,
    setBookingData
  } = useBooking();
  
  const { items } = useCart();
  const [formErrors, setFormErrors] = useState<FormValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);
  
  // Helper functions
  const isSunday = useCallback((dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getDay() === 0;
  }, []);
  
  const hasCribOrPackAndPlay = useCallback((): boolean => {
    return items.some(item => {
      const name = item.equipment_name.toLowerCase();
      return name.includes('crib') || name.includes('pack and play') || name.includes('pack & play');
    });
  }, [items]);

  // Validate form before submission
  const validateForm = (): FormValidationErrors => {
    const errors: FormValidationErrors = {};
    
    // Date validation
    if (!bookingData.startDate || !bookingData.endDate) {
      errors.dates = 'Please select both start and end dates';
    } else if (new Date(bookingData.startDate) >= new Date(bookingData.endDate)) {
      errors.dates = 'End date must be after start date';
    } else if (new Date(bookingData.startDate) < new Date()) {
      errors.dates = 'Start date cannot be in the past';
    }
    
    // Sunday validation
    if (bookingData.startDate && isSunday(bookingData.startDate)) {
      if (!hasCribOrPackAndPlay()) {
        errors.sunday = 'Sunday bookings require a crib or pack and play.';
      }
    }
    
    // Delivery slot validation
    if (!bookingData.deliverySlot) {
      errors.deliverySlot = 'Please select a delivery time slot';
    }
    
    // Pickup slot validation
    if (!bookingData.pickupSlot) {
      errors.pickupSlot = 'Please select a pickup time slot';
    }
    
    // Equipment validation
    if (items.length === 0) {
      errors.equipment = 'Your cart is empty. Please add items before booking.';
    } else {
      // Check for stock availability
      const stockIssues = items.filter(item => {
        const product = products.find(p => p.id === item.equipment_id);
        return !product || product.stock_quantity < item.quantity;
      });
      
      if (stockIssues.length > 0) {
        errors.equipment = 'Some selected items exceed available stock';
      }
    }
    
    // Customer information validation
    const { customerInfo } = bookingData;
    if (!customerInfo.name?.trim()) {
      errors.customer = 'Customer name is required';
    } else if (!customerInfo.email?.trim()) {
      errors.customer = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      errors.customer = 'Please enter a valid email address';
    } else if (!customerInfo.phone?.trim()) {
      errors.customer = 'Phone number is required';
    }
    
    return errors;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsValidating(true);
    const errors = validateForm();
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setIsValidating(false);
      return;
    }
    
    try {
      await submitBooking(e);
      setFormErrors({});
    } catch (error) {
      setFormErrors({ general: 'An error occurred while submitting your booking. Please try again.' });
    } finally {
      setIsValidating(false);
    }
  };
  
  // Clear errors when relevant data changes
  useEffect(() => {
    if (formErrors.dates && bookingData.startDate && bookingData.endDate) {
      setFormErrors(prev => ({ ...prev, dates: undefined }));
    }
  }, [bookingData.startDate, bookingData.endDate, formErrors.dates]);
  
  useEffect(() => {
    if (formErrors.deliverySlot && bookingData.deliverySlot) {
      setFormErrors(prev => ({ ...prev, deliverySlot: undefined }));
    }
  }, [bookingData.deliverySlot, formErrors.deliverySlot]);
  
  useEffect(() => {
    if (formErrors.pickupSlot && bookingData.pickupSlot) {
      setFormErrors(prev => ({ ...prev, pickupSlot: undefined }));
    }
  }, [bookingData.pickupSlot, formErrors.pickupSlot]);
  
  useEffect(() => {
    // Clear Sunday error if conditions change
    if (formErrors.sunday && 
        ((!bookingData.startDate || !isSunday(bookingData.startDate)) || hasCribOrPackAndPlay())) {
      setFormErrors(prev => ({ ...prev, sunday: undefined }));
    }
  }, [bookingData.startDate, formErrors.sunday, hasCribOrPackAndPlay, isSunday]);
  
  useEffect(() => {
    if (formErrors.equipment && items.length > 0) {
      setFormErrors(prev => ({ ...prev, equipment: undefined }));
    }
  }, [items.length, formErrors.equipment]);
  
  useEffect(() => {
    if (formErrors.customer && bookingData.customerInfo.name && bookingData.customerInfo.email) {
      setFormErrors(prev => ({ ...prev, customer: undefined }));
    }
  }, [bookingData.customerInfo, formErrors.customer]);

  const showSummary = items.length > 0 && bookingData.startDate && bookingData.endDate;
  const hasErrors = Object.values(formErrors).some(error => error);
  const isSundayStart = bookingData.startDate && isSunday(bookingData.startDate);
  const hasSundayRequirement = isSundayStart && !hasCribOrPackAndPlay();
  const isFormDisabled = items.length === 0 || !bookingData.startDate || !bookingData.endDate || 
                         !bookingData.deliverySlot || !bookingData.pickupSlot || 
                         hasSundayRequirement || isSubmitting || isValidating;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Error Alert */}
        {formErrors.general && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formErrors.general}</AlertDescription>
          </Alert>
        )}
        
        {/* Sunday Booking Alert */}
        {isSundayStart && !hasCribOrPackAndPlay() && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sunday Booking Notice:</strong> A crib or pack and play is required to start a booking on Sunday.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Sunday Booking Success Info */}
        {isSundayStart && hasCribOrPackAndPlay() && (
          <Alert className="bg-blue-50 border-blue-200">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Sunday Booking Ready:</strong> Sunday time slots and the one-time fee apply.
            </AlertDescription>
          </Alert>
        )}

        {/* Date Selection */}
        <div className="space-y-2">
          <DateSelection
            startDate={bookingData.startDate}
            endDate={bookingData.endDate}
            onStartDateChange={(date) => updateDates('startDate', date)}
            onEndDateChange={(date) => updateDates('endDate', date)}
          />
          {formErrors.dates && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formErrors.dates}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Equipment Selection */}
        <EquipmentSelection
          products={products}
          selectedEquipment={selectedEquipment}
          quantity={quantity}
          setSelectedEquipment={setSelectedEquipment}
          setQuantity={setQuantity}
          currentSelectedDate={bookingData.startDate ? new Date(bookingData.startDate) : undefined}
        />

        {/* Delivery Slot Selection */}
        {bookingData.startDate && (
          <div className="space-y-2">
            <DeliverySlotSelector
              selectedDate={bookingData.startDate}
              selectedSlot={bookingData.deliverySlot}
              onSlotChange={(slot) => {
                setBookingData(prev => ({ ...prev, deliverySlot: slot }));
              }}
              disabled={Boolean(isSubmitting || isValidating || hasSundayRequirement)}
            />
            {formErrors.deliverySlot && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formErrors.deliverySlot}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {/* Pickup Slot Selection */}
        {bookingData.endDate && (
          <div className="space-y-2">
            <PickupSlotSelector
              selectedDate={bookingData.endDate}
              selectedSlot={bookingData.pickupSlot}
              onSlotChange={(slot) => {
                setBookingData(prev => ({ ...prev, pickupSlot: slot }));
              }}
              disabled={Boolean(isSubmitting || isValidating || hasSundayRequirement)}
            />
            {formErrors.pickupSlot && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formErrors.pickupSlot}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Customer Information */}
        <div className="space-y-2">
          <CustomerInformation
            customerInfo={bookingData.customerInfo}
            onCustomerInfoChange={updateCustomerInfo}
          />
          {formErrors.customer && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formErrors.customer}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Booking Summary */}
        {showSummary && bookingData.deliverySlot && bookingData.pickupSlot && (
          <BookingSummary
            days={calculateDays()}
            itemsCount={items.length}
            total={calculateTotal()}
            startDate={bookingData.startDate}
            deliverySlot={bookingData.deliverySlot}
            pickupSlot={bookingData.pickupSlot}
          />
        )}

        {/* Form Validation Summary */}
        {hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the errors above before submitting your reservation.
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={isFormDisabled}
          variant={hasErrors ? "secondary" : "default"}
        >
          {isSubmitting || isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isValidating ? 'Validating...' : 'Submitting...'}
            </>
          ) : (
            <>
              Submit Reservation
            </>
          )}
        </Button>
        
        {/* Form Status Indicator */}
        {!hasErrors && showSummary && bookingData.deliverySlot && bookingData.pickupSlot && !hasSundayRequirement && (
          <div className="text-center text-sm text-muted-foreground">
            All information is valid. Ready to submit your reservation.
          </div>
        )}
      </form>
    </div>
  );
};
