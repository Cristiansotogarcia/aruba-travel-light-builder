
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DateSelection } from './DateSelection';
import EquipmentSelection from './EquipmentSelection';
import { CustomerInformation } from './CustomerInformation';
import { BookingSummary } from './BookingSummary';
import useBooking from '@/hooks/useBooking';

import { useSearchParams } from 'react-router-dom';

import { useCart } from '@/hooks/useCart';

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

  const showSummary = bookingData.items.length > 0 && bookingData.startDate && bookingData.endDate;


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={submitBooking} className="space-y-6">
        <DateSelection
          startDate={bookingData.startDate}
          endDate={bookingData.endDate}
          onStartDateChange={(date) => updateDates('startDate', date)}
          onEndDateChange={(date) => updateDates('endDate', date)}
        />

        <EquipmentSelection
          products={products} // Pass products to EquipmentSelection
          selectedEquipment={selectedEquipment}
          quantity={quantity}
          setSelectedEquipment={setSelectedEquipment}
          setQuantity={setQuantity}
          currentSelectedDate={bookingData.startDate ? new Date(bookingData.startDate) : undefined}
        />

        <CustomerInformation
          customerInfo={bookingData.customerInfo}
          onCustomerInfoChange={updateCustomerInfo}
        />

        {showSummary && (
          <BookingSummary
            days={calculateDays()}
            itemsCount={items.length}
            total={calculateTotal()}
          />
        )}

        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={items.length === 0 || !bookingData.startDate || !bookingData.endDate || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Proceed to Payment'}
        </Button>
      </form>
    </div>
  );
};