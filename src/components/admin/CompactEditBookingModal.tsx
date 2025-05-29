
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CustomerInfoSection } from './edit-booking/CustomerInfoSection';
import { DateSelectionSection } from './edit-booking/DateSelectionSection';
import { EquipmentSelectionSection } from './edit-booking/EquipmentSelectionSection';
import { BookingSummarySection } from './edit-booking/BookingSummarySection';
import { useBookingEquipment } from './edit-booking/useBookingEquipment';
import { Booking, CustomerInfo } from './edit-booking/types';

interface CompactEditBookingModalProps {
  booking: Booking;
  onBookingUpdated: () => void;
  onClose: () => void;
  open: boolean;
}

export const CompactEditBookingModal = ({ booking, onBookingUpdated, onClose, open }: CompactEditBookingModalProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const {
    selectedEquipment,
    bookingItems,
    setSelectedEquipment,
    setBookingItems,
    addEquipment,
    updateQuantity,
    removeItem
  } = useBookingEquipment();

  useEffect(() => {
    if (booking && open) {
      setStartDate(booking.start_date);
      setEndDate(booking.end_date);
      setCustomerInfo({
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
        address: booking.customer_address
      });
      setBookingItems(booking.booking_items || []);
      setDiscount(0);
    }
  }, [booking, open, setBookingItems]);

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    return Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
  };

  const calculateSubtotal = () => {
    return bookingItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - discount;
  };

  const handleAddEquipment = () => {
    addEquipment(startDate, endDate);
  };

  const handleUpdateQuantity = (equipmentId: string, change: number) => {
    updateQuantity(equipmentId, change, startDate, endDate);
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || bookingItems.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and add at least one equipment item.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const totalAmount = calculateTotal();
      
      // Check if dates have changed
      const dateChanged = startDate !== booking.start_date || endDate !== booking.end_date;
      
      // Determine new status - if rescheduling an undeliverable booking with date changes, set to confirmed
      let newStatus = booking.status;
      if (booking.status === 'undeliverable' && dateChanged) {
        newStatus = 'confirmed';
      }

      // Prepare update data
      const updateData: any = {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        start_date: startDate,
        end_date: endDate,
        total_amount: totalAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Clear delivery failure reason if status is changing away from undeliverable
      if (newStatus !== 'undeliverable') {
        updateData.delivery_failure_reason = null;
      }

      const { error: bookingError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Delete existing booking items
      const { error: deleteError } = await supabase
        .from('booking_items')
        .delete()
        .eq('booking_id', booking.id);

      if (deleteError) throw deleteError;

      // Create new booking items
      const bookingItemsData = bookingItems.map(item => ({
        booking_id: booking.id,
        equipment_id: item.equipment_id,
        equipment_name: item.equipment_name,
        equipment_price: item.equipment_price,
        quantity: item.quantity,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItemsData);

      if (itemsError) throw itemsError;

      // Show appropriate success message
      const statusMessage = booking.status === 'undeliverable' && dateChanged 
        ? `Booking #${booking.id.substring(0, 8)} has been rescheduled and status updated to confirmed.`
        : `Booking #${booking.id.substring(0, 8)} has been updated.`;

      toast({
        title: "Booking Updated Successfully!",
        description: statusMessage,
      });

      onBookingUpdated();
      onClose();

    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error Updating Booking",
        description: "There was an error updating the booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[540px] overflow-hidden">
        <SheetHeader>
          <SheetTitle>
            {booking.status === 'undeliverable' ? 'Reschedule Delivery' : 'Edit Booking'} #{booking.id.substring(0, 8)}
          </SheetTitle>
        </SheetHeader>
        
        <div className="h-full flex flex-col py-4">
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            <CustomerInfoSection
              customerInfo={customerInfo}
              onCustomerInfoChange={setCustomerInfo}
            />

            <DateSelectionSection
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />

            <EquipmentSelectionSection
              selectedEquipment={selectedEquipment}
              bookingItems={bookingItems}
              onSelectedEquipmentChange={setSelectedEquipment}
              onAddEquipment={handleAddEquipment}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={removeItem}
            />
          </div>

          <div className="border-t pt-4">
            <BookingSummarySection
              startDate={startDate}
              endDate={endDate}
              bookingItems={bookingItems}
              discount={discount}
              loading={loading}
              isUndeliverable={booking.status === 'undeliverable'}
              onDiscountChange={setDiscount}
              onSubmit={handleSubmit}
              onCancel={onClose}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
