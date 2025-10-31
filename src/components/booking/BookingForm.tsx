import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateSelection } from './DateSelection';
import { DeliverySlotSelector } from './DeliverySlotSelector';
import { CustomerInformation } from './CustomerInformation';
import { BookingSummary } from './BookingSummary';
import useBooking from '@/hooks/useBooking';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { AlertCircle, Loader2, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FormValidationErrors {
  dates?: string;
  deliverySlot?: string;
  equipment?: string;
  customer?: string;
  general?: string;
}

export const BookingForm = () => {
  const {
    bookingData,
    products,
    isSubmitting,
    updateCustomerInfo,
    updateDates,
    calculateDays,
    calculateTotal,
    submitBooking,
    setBookingData
  } = useBooking();
  
  const { items } = useCart();
  const navigate = useNavigate();
  const [formErrors, setFormErrors] = useState<FormValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

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
    
    // Delivery slot validation
    if (!bookingData.deliverySlot) {
      errors.deliverySlot = 'Please select a delivery time slot';
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
  const isFormDisabled = items.length === 0 || !bookingData.startDate || !bookingData.endDate || !bookingData.deliverySlot || isSubmitting || isValidating;

  if (items.length === 0) {
    return null; // Will redirect via useEffect
  }

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

        {/* Cart Items Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Your Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.equipment_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.equipment_name}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-primary">${item.equipment_price.toFixed(2)}/day</p>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => navigate('/cart')}
              >
                Edit Cart
              </Button>
            </div>
          </CardContent>
        </Card>
        
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

        {/* Delivery Slot Selection */}
        {bookingData.startDate && (
          <div className="space-y-2">
            <DeliverySlotSelector
              selectedDate={bookingData.startDate}
              selectedSlot={bookingData.deliverySlot}
              onSlotChange={(slot) => {
                setBookingData(prev => ({ ...prev, deliverySlot: slot }));
              }}
              disabled={isSubmitting || isValidating}
            />
            {formErrors.deliverySlot && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formErrors.deliverySlot}</AlertDescription>
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
        {showSummary && (
          <BookingSummary
            days={calculateDays()}
            itemsCount={items.length}
            total={calculateTotal()}
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
        {!hasErrors && showSummary && bookingData.deliverySlot && (
          <div className="text-center text-sm text-muted-foreground">
            ✓ All information is valid. Ready to submit your reservation.
          </div>
        )}
      </form>
    </div>
  );
};
