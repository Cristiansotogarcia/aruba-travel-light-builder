import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@/components/ui/button';
import { DateSelection } from './DateSelection';
import EquipmentSelection from './EquipmentSelection';
import { CustomerInformation } from './CustomerInformation';
import { BookingSummary } from './BookingSummary';
import useBooking from '@/hooks/useBooking';
export const BookingForm = () => {
    const { bookingData, products, // Destructure products from useBooking
    selectedEquipment, quantity, isSubmitting, setSelectedEquipment, setQuantity, addEquipment, removeEquipment, updateCustomerInfo, updateDates, calculateDays, calculateTotal, submitBooking } = useBooking();
    const showSummary = bookingData.items.length > 0 && bookingData.startDate && bookingData.endDate;
    return (_jsx("div", { className: "max-w-4xl mx-auto space-y-6", children: _jsxs("form", { onSubmit: submitBooking, className: "space-y-6", children: [_jsx(DateSelection, { startDate: bookingData.startDate, endDate: bookingData.endDate, onStartDateChange: (date) => updateDates('startDate', date), onEndDateChange: (date) => updateDates('endDate', date) }), _jsx(EquipmentSelection, { products: products, selectedEquipment: selectedEquipment, quantity: quantity, bookingItems: bookingData.items, setSelectedEquipment: setSelectedEquipment, setQuantity: setQuantity, addEquipment: addEquipment, removeEquipment: removeEquipment, currentSelectedDate: bookingData.startDate ? new Date(bookingData.startDate) : undefined }), _jsx(CustomerInformation, { customerInfo: bookingData.customerInfo, onCustomerInfoChange: updateCustomerInfo }), showSummary && (_jsx(BookingSummary, { days: calculateDays(), itemsCount: bookingData.items.length, total: calculateTotal() })), _jsx(Button, { type: "submit", className: "w-full", size: "lg", disabled: bookingData.items.length === 0 || !bookingData.startDate || !bookingData.endDate || isSubmitting, children: isSubmitting ? 'Submitting...' : 'Submit Booking Request' })] }) }));
};
