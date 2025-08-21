
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, BookingFormData, CustomerInfo, AvailabilityStatus, SupabaseBookingData } from '../types/types';
import { SupabaseBookingItemData } from '../types/booking'; // Import from the new file
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';

// All interfaces like Product, BookingFormData, BookingItem, CustomerInfo, 
// SupabaseBookingData, SupabaseBookingItemData are now imported from '../types/types'.
// Ensure no local definitions of these interfaces exist below.

const initialBookingData: BookingFormData = {
  startDate: '',
  endDate: '',
  items: [],
  customerInfo: {
    name: '',
    email: '',
    phone: '',
    address: '',
    comment: ''
  }
};

const useBooking = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [bookingData, setBookingData] = useState<BookingFormData>(initialBookingData);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: cartItems, clearCart } = useCart();

  useEffect(() => {
    setBookingData(prev => ({ ...prev, items: cartItems }));
  }, [cartItems]);

  useEffect(() => {
    const fetchProducts = async () => {
      // Define a type for the raw data from Supabase that includes stock_quantity
      type RawProductData = {
        id: string;
        name: string;
        description: string | null;
        price_per_day: number;
        category: string;
        images: string[] | null;
        stock_quantity: number | null;
        availability_status?: AvailabilityStatus | null;
        created_at?: string;
        updated_at?: string;
      };

      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, description, price_per_day, category, images, stock_quantity, availability_status, created_at, updated_at');

      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error Fetching Equipment',
          description: 'Could not load equipment data. Please try again later.',
          variant: 'destructive',
        });
        setProducts([]);
      } else {
        // Convert the raw data to Product type with proper handling of missing fields
        const productsWithStatus = (data as RawProductData[]).map(item => {
          const stockQuantity = item.stock_quantity ?? 0;

          let availability_status: AvailabilityStatus;
          if (item.availability_status) {
            availability_status = item.availability_status;
          } else if (stockQuantity <= 0) {
            availability_status = 'Out of Stock';
          } else if (stockQuantity <= 5) {
            availability_status = 'Low Stock';
          } else {
            availability_status = 'Available';
          }

          // Create a properly typed Product object
          const product: Product = {
            id: item.id,
            name: item.name,
            description: item.description || '',
            price_per_day: item.price_per_day,
            category: item.category,
            images: item.images || [],
            stock_quantity: stockQuantity,
            availability_status,
            created_at: item.created_at,
            updated_at: item.updated_at,
          };

          return product;
        });

        setProducts(productsWithStatus);
      }
    };

    fetchProducts();
  }, [toast]);

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
      const equipment = products.find(eq => eq.id === item.equipment_id); // Changed from product_id
      return total + (equipment ? equipment.price_per_day * item.quantity * days : 0);
    }, 0);
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic validation
    if (!bookingData.startDate || !bookingData.endDate) {
      toast({ title: 'Missing Dates', description: 'Please select start and end dates.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    if (bookingData.items.length === 0) {
      toast({ title: 'Empty Booking', description: 'Please add equipment to your booking.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    if (!bookingData.customerInfo.name || !bookingData.customerInfo.email) {
      toast({ title: 'Missing Customer Info', description: 'Please provide customer name and email.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to create a booking.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    try {
      const days = calculateDays();
      if (days <= 0) {
        toast({ title: 'Invalid Dates', description: 'End date must be after start date.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const bookingPayload: Omit<SupabaseBookingData, 'created_at' | 'total_price' | 'customer_address'> & { customer_address: string } = {
        user_id: user.id,

        start_date: bookingData.startDate,
        end_date: bookingData.endDate,
        customer_name: bookingData.customerInfo.name,
        customer_email: bookingData.customerInfo.email,
        customer_phone: bookingData.customerInfo.phone,
        customer_address: bookingData.customerInfo.address,
        customer_comment: bookingData.customerInfo.comment || null,
        total_amount: calculateTotal(), // Corrected function call
        status: 'pending', // Default status
        // items will be handled by booking_items table
      };

      const { data: bookingInsertData, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select()
        .single();

      if (bookingError || !bookingInsertData) {
        toast({ title: 'Booking Error', description: bookingError?.message || 'Could not create booking.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // Now insert booking items
      const bookingItemsPayload: SupabaseBookingItemData[] = bookingData.items.map(item => ({
        booking_id: bookingInsertData.id,
        equipment_id: item.equipment_id,
        equipment_name: item.equipment_name,
        quantity: item.quantity,
        equipment_price: item.equipment_price,
        price_at_booking: item.equipment_price,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItemsPayload);

      if (itemsError) {
        // Potentially attempt to roll back booking creation or mark as failed
        toast({ title: 'Booking Item Error', description: `Booking created, but failed to add items: ${itemsError.message}`, variant: 'destructive' });
        setIsSubmitting(false);
        // Consider deleting the booking if items fail to insert, or have a status for partial bookings
        // await supabase.from('bookings').delete().match({ id: bookingInsertData.id });
        return;
      }

      // Decrement stock quantities for each booked equipment
      for (const item of bookingData.items) {
        const { data: currentStock, error: stockFetchError } = await supabase
          .from('equipment')
          .select('stock_quantity')
          .eq('id', item.equipment_id)
          .single();

        if (stockFetchError || !currentStock) {
          toast({
            title: 'Stock Update Error',
            description: `Failed to fetch stock for ${item.equipment_name}.`,
            variant: 'destructive',
          });
          continue;
        }

        const newQuantity = Math.max(0, (currentStock.stock_quantity ?? 0) - item.quantity);

        const { error: stockUpdateError } = await supabase
          .from('equipment')
          .update({ stock_quantity: newQuantity })
          .eq('id', item.equipment_id);

        if (stockUpdateError) {
          toast({
            title: 'Stock Update Error',
            description: `Failed to update stock for ${item.equipment_name}.`,
            variant: 'destructive',
          });
        }
      }

      // Create payment session
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke<{ paymentUrl: string }>(
        'create-payment-session',
        {
          body: {
            bookingId: bookingInsertData.id,
            amount: calculateTotal(),
            successUrl: `${window.location.origin}/payment-success?booking_id=${bookingInsertData.id}`,
            cancelUrl: `${window.location.origin}/payment-error?booking_id=${bookingInsertData.id}`,
          },
        },
      );

      if (paymentError || !paymentData?.paymentUrl) {
        toast({ title: 'Payment Error', description: 'Could not initiate payment.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      setBookingData(initialBookingData);
      clearCart();
      window.location.href = paymentData.paymentUrl;
      return;
    } catch (error) {
      toast({ title: 'Unexpected Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    products,
    bookingData,
    selectedEquipment,
    quantity,
    isSubmitting,
    updateCustomerInfo,
    updateDates,
    calculateTotal,
    calculateDays,
    submitBooking,
    setSelectedEquipment,
    setQuantity,
    setBookingData
  };
};

export default useBooking;
