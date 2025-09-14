
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
      const equipment = products.find(eq => eq.id === item.equipment_id);
      return total + (equipment ? equipment.price_per_day * item.quantity * days : 0);
    }, 0);
  };

  const validateBookingData = () => {
    const errors: string[] = [];
    
    if (!bookingData.startDate || !bookingData.endDate) {
      errors.push('Please select start and end dates.');
    }
    
    if (bookingData.startDate && bookingData.endDate) {
      const start = new Date(bookingData.startDate);
      const end = new Date(bookingData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (start < today) {
        errors.push('Start date cannot be in the past.');
      }
      
      if (end <= start) {
        errors.push('End date must be after start date.');
      }
      
      const maxDays = 365; // Maximum rental period
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days > maxDays) {
        errors.push(`Rental period cannot exceed ${maxDays} days.`);
      }
    }
    
    if (bookingData.items.length === 0) {
      errors.push('Please add equipment to your booking.');
    }
    
    // Validate customer information
    const { name, email, phone } = bookingData.customerInfo;
    if (!name?.trim()) {
      errors.push('Customer name is required.');
    }
    
    if (!email?.trim()) {
      errors.push('Customer email is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address.');
    }
    
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Please enter a valid phone number.');
    }
    
    // Validate stock availability
    for (const item of bookingData.items) {
      const equipment = products.find(eq => eq.id === item.equipment_id);
      if (!equipment) {
        errors.push(`Equipment ${item.equipment_name} is no longer available.`);
      } else if (equipment.stock_quantity < item.quantity) {
        errors.push(`Insufficient stock for ${item.equipment_name}. Available: ${equipment.stock_quantity}, Requested: ${item.quantity}`);
      }
    }
    
    return errors;
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Enhanced validation
      const validationErrors = validateBookingData();
      if (validationErrors.length > 0) {
        toast({ 
          title: 'Validation Error', 
          description: validationErrors.join(' '), 
          variant: 'destructive' 
        });
        return;
      }

      if (!user) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to create a booking.', variant: 'destructive' });
        return;
      }

      // Create booking with enhanced error handling and rollback
      let bookingId: string | null = null;
      let reservedItems: Array<{ equipment_id: string; quantity: number }> = [];
      
      try {
        // Step 1: Reserve equipment stock first using the database function
        for (const item of bookingData.items) {
          const { data, error } = await supabase.rpc('reserve_equipment_stock', {
            p_equipment_id: item.equipment_id,
            p_quantity: item.quantity,
            p_booking_reference: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
          
          if (error || !data) {
            throw new Error(`Failed to reserve stock for ${item.equipment_name}: ${error?.message || 'Unknown error'}`);
          }
          
          reservedItems.push({ equipment_id: item.equipment_id, quantity: item.quantity });
        }

        // Step 2: Create booking record
        const bookingPayload = {
          user_id: user.id,
          start_date: bookingData.startDate,
          end_date: bookingData.endDate,
          total_amount: calculateTotal(),
          status: 'pending',
          customer_name: bookingData.customerInfo.name.trim(),
          customer_email: bookingData.customerInfo.email.trim().toLowerCase(),
          customer_phone: bookingData.customerInfo.phone?.trim() || null,
          delivery_address: bookingData.customerInfo.address?.trim() || null,
          special_requests: bookingData.customerInfo.specialRequests?.trim() || null
        };

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert(bookingPayload)
          .select()
          .single();

        if (bookingError || !booking) {
          throw new Error(`Failed to create booking: ${bookingError?.message || 'Unknown error'}`);
        }
        
        bookingId = booking.id;

        // Step 3: Create booking items
        const bookingItems = bookingData.items.map(item => ({
          booking_id: booking.id,
          equipment_id: item.equipment_id,
          quantity: item.quantity,
          unit_price: item.unit_price || item.equipment_price,
          total_price: item.total_price || item.subtotal
        }));

        const { error: itemsError } = await supabase
          .from('booking_items')
          .insert(bookingItems);

        if (itemsError) {
          throw new Error(`Failed to create booking items: ${itemsError.message}`);
        }

        // Step 4: Update stock reservations with actual booking ID
        for (const item of reservedItems) {
          const { error: updateError } = await supabase
            .from('stock_movements')
            .update({ booking_id: booking.id })
            .eq('equipment_id', item.equipment_id)
            .eq('movement_type', 'reservation')
            .is('booking_id', null)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (updateError) {
            console.warn(`Warning: Could not link stock movement to booking for equipment ${item.equipment_id}:`, updateError);
          }
        }

        // Step 5: Create payment session
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-session', {
          body: {
            booking_id: booking.id,
            amount: calculateTotal(),
            currency: 'usd',
            customer_email: bookingData.customerInfo.email.trim().toLowerCase(),
            customer_name: bookingData.customerInfo.name.trim(),
            success_url: `${window.location.origin}/payment-success?booking_id=${booking.id}`,
            cancel_url: `${window.location.origin}/payment-error?booking_id=${booking.id}`
          }
        });

        if (paymentError || !paymentData?.url) {
          throw new Error(`Failed to create payment session: ${paymentError?.message || 'No payment URL returned'}`);
        }

        // Success: Reset booking data and redirect to payment
        setBookingData(initialBookingData);
        clearCart();
        
        toast({ 
          title: 'Booking Created', 
          description: 'Redirecting to payment...', 
          variant: 'default' 
        });
        
        // Small delay to show success message
        setTimeout(() => {
          window.location.href = paymentData.url;
        }, 1000);

      } catch (error: any) {
        console.error('Error during booking submission:', error);
        
        // Rollback: Release reserved stock
        if (reservedItems.length > 0) {
          for (const item of reservedItems) {
            try {
              await supabase.rpc('release_equipment_stock', {
                p_equipment_id: item.equipment_id,
                p_quantity: item.quantity,
                p_booking_reference: bookingId || `temp_${Date.now()}`
              });
            } catch (releaseError) {
              console.error(`Failed to release stock for equipment ${item.equipment_id}:`, releaseError);
            }
          }
        }
        
        // Rollback: Delete booking if created
        if (bookingId) {
          try {
            await supabase
              .from('bookings')
              .delete()
              .eq('id', bookingId);
          } catch (deleteError) {
            console.error('Failed to delete booking during rollback:', deleteError);
          }
        }
        
        // Show user-friendly error message
        const errorMessage = error.message || 'An unexpected error occurred';
        toast({ 
          title: 'Booking Failed', 
          description: errorMessage, 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      console.error('Unexpected error during booking submission:', error);
      toast({ 
        title: 'Unexpected Error', 
        description: 'An unexpected error occurred. Please try again.', 
        variant: 'destructive' 
      });
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
