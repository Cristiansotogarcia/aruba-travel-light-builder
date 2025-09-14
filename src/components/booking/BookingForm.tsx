
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateSelection } from './DateSelection';
import EquipmentSelection from './EquipmentSelection';
import { CustomerInformation } from './CustomerInformation';
import { BookingSummary } from './BookingSummary';
import useBooking from '@/hooks/useBooking';
import { useSearchParams } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';

interface FormValidationErrors {
  dates?: string;
  equipment?: string;
  customer?: string;
  general?: string;
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
    submitBooking
  } = useBooking();
  const { items } = useCart();
  
  const [formErrors, setFormErrors] = useState<FormValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);

  const [searchParams] = useSearchParams();
  const equipmentId = searchParams.get('equipmentId');

  useEffect(() => {
    if (equipmentId && products.length > 0) {
      const match = products.find(p => p.id === equipmentId);
      if (match) {
        setSelectedEquipment(equipmentId);
      }
    }
  }, [equipmentId, products, setSelectedEquipment]);

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
    
    // Equipment validation
    if (items.length === 0) {
      errors.equipment = 'Please select at least one equipment item';
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
  const isFormDisabled = items.length === 0 || !bookingData.startDate || !bookingData.endDate || isSubmitting || isValidating;


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
        <div className="space-y-2">
          <EquipmentSelection
            products={products}
            selectedEquipment={selectedEquipment}
            quantity={quantity}
            setSelectedEquipment={setSelectedEquipment}
            setQuantity={setQuantity}
            currentSelectedDate={bookingData.startDate ? new Date(bookingData.startDate) : undefined}
          />
          {formErrors.equipment && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formErrors.equipment}</AlertDescription>
            </Alert>
          )}
        </div>

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
              Please fix the errors above before proceeding to payment.
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
              {isValidating ? 'Validating...' : 'Processing...'}
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Proceed to Payment
            </>
          )}
        </Button>
        
        {/* Form Status Indicator */}
        {!hasErrors && showSummary && (
          <div className="text-center text-sm text-muted-foreground">
            ✓ All information is valid. Ready to proceed with payment.
          </div>
        )}
      </form>
    </div>
  );
};