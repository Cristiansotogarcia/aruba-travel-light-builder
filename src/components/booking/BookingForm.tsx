
import { Button } from '@/components/ui/button';
import { DateSelection } from './DateSelection';
import EquipmentSelection from './EquipmentSelection';
import { CustomerInformation } from './CustomerInformation';
import { BookingSummary } from './BookingSummary';
import useBooking from '@/hooks/useBooking';

export const BookingForm = () => {
  const {
    bookingData,
    products, // Destructure products from useBooking
    selectedEquipment,
    quantity,
    isSubmitting,
    setSelectedEquipment,
    setQuantity,
    addEquipment,
    removeEquipment,
    updateCustomerInfo,
    updateDates,
    calculateDays,
    calculateTotal,
    submitBooking
  } = useBooking();

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
          bookingItems={bookingData.items}
          setSelectedEquipment={setSelectedEquipment}
          setQuantity={setQuantity}
          addEquipment={addEquipment}
          removeEquipment={removeEquipment}
          currentSelectedDate={bookingData.startDate ? new Date(bookingData.startDate) : undefined}
        />

        <CustomerInformation
          customerInfo={bookingData.customerInfo}
          onCustomerInfoChange={updateCustomerInfo}
        />

        {showSummary && (
          <BookingSummary
            days={calculateDays()}
            itemsCount={bookingData.items.length}
            total={calculateTotal()}
          />
        )}

        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={bookingData.items.length === 0 || !bookingData.startDate || !bookingData.endDate || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Booking Request'}
        </Button>
      </form>
    </div>
  );
};