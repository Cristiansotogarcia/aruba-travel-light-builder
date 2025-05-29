
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mockEquipment } from '@/data/mockEquipment';

interface BookingItem {
  equipmentId: string;
  quantity: number;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface BookingFormData {
  startDate: string;
  endDate: string;
  items: BookingItem[];
  customerInfo: CustomerInfo;
}

export const useBooking = () => {
  const [bookingData, setBookingData] = useState<BookingFormData>({
    startDate: '',
    endDate: '',
    items: [],
    customerInfo: {
      name: '',
      email: '',
      phone: '',
      address: ''
    }
  });

  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const addEquipment = () => {
    if (!selectedEquipment) return;
    
    const existingItem = bookingData.items.find(item => item.equipmentId === selectedEquipment);
    if (existingItem) {
      setBookingData(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.equipmentId === selectedEquipment
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }));
    } else {
      setBookingData(prev => ({
        ...prev,
        items: [...prev.items, { equipmentId: selectedEquipment, quantity }]
      }));
    }
    
    setSelectedEquipment('');
    setQuantity(1);
  };

  const removeEquipment = (equipmentId: string) => {
    setBookingData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.equipmentId !== equipmentId)
    }));
  };

  const updateCustomerInfo = (field: keyof CustomerInfo, value: string) => {
    setBookingData(prev => ({
      ...prev,
      customerInfo: {
        ...prev.customerInfo,
        [field]: value
      }
    }));
  };

  const updateDates = (field: 'startDate' | 'endDate', value: string) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const calculateDays = () => {
    if (!bookingData.startDate || !bookingData.endDate) return 0;
    const start = new Date(bookingData.startDate);
    const end = new Date(bookingData.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateTotal = () => {
    if (!bookingData.startDate || !bookingData.endDate) return 0;
    
    const days = calculateDays();
    
    return bookingData.items.reduce((total, item) => {
      const equipment = mockEquipment.find(eq => eq.id === item.equipmentId);
      return total + (equipment ? equipment.price * item.quantity * days : 0);
    }, 0);
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotal();
      const days = calculateDays();

      // Create the booking record
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_name: bookingData.customerInfo.name,
          customer_email: bookingData.customerInfo.email,
          customer_phone: bookingData.customerInfo.phone,
          customer_address: bookingData.customerInfo.address,
          start_date: bookingData.startDate,
          end_date: bookingData.endDate,
          total_amount: totalAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        throw bookingError;
      }

      // Create booking items
      const bookingItems = bookingData.items.map(item => {
        const equipment = mockEquipment.find(eq => eq.id === item.equipmentId);
        const subtotal = equipment ? equipment.price * item.quantity * days : 0;
        
        return {
          booking_id: booking.id,
          equipment_id: item.equipmentId,
          equipment_name: equipment?.name || '',
          equipment_price: equipment?.price || 0,
          quantity: item.quantity,
          subtotal: subtotal
        };
      });

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItems);

      if (itemsError) {
        console.error('Error creating booking items:', itemsError);
        throw itemsError;
      }

      toast({
        title: "Booking Submitted Successfully!",
        description: `Your booking request #${booking.id.substring(0, 8)} has been submitted. We will contact you shortly to confirm the details.`,
      });

      // Reset form
      setBookingData({
        startDate: '',
        endDate: '',
        items: [],
        customerInfo: {
          name: '',
          email: '',
          phone: '',
          address: ''
        }
      });

    } catch (error) {
      console.error('Error submitting booking:', error);
      toast({
        title: "Error Submitting Booking",
        description: "There was an error submitting your booking request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    bookingData,
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
  };
};
