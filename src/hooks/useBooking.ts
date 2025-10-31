
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, BookingFormData, CustomerInfo, AvailabilityStatus } from '../types/types';
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
    room_number: '',
    comment: ''
  },
  deliverySlot: undefined,
  pickupSlot: undefined
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
        price_per_week?: number | null;
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
            price_per_week: item.price_per_week ?? undefined,
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

  // Helper function to check if a date is Sunday
  const isSunday = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date.getDay() === 0;
  };

  // Helper function to calculate delivery fee
  const calculateDeliveryFee = (startDate: string, days: number): number => {
    // Sunday bookings: $20 fee
    if (isSunday(startDate)) return 20;
    
    // Rentals < 5 days: $10 fee (1-4 days get charged)
    if (days < 5) return 10;
    
    // Weekly rentals (5-7 days) or longer: FREE
    return 0;
  };

  const calculateDays = () => {
    if (!bookingData.startDate || !bookingData.endDate) return 0;
    const start = new Date(bookingData.startDate);
    const end = new Date(bookingData.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateTotal = () => {
    if (!bookingData.startDate || !bookingData.endDate) return 0;
    
    let days = calculateDays();
    
    // Time slot adjustment: Add 1 day if delivery is morning and pickup is afternoon
    if (bookingData.deliverySlot === 'morning' && bookingData.pickupSlot === 'afternoon') {
      days += 1;
    }
    
    // Calculate equipment costs
    const equipmentTotal = bookingData.items.reduce((total, item) => {
      const equipment = products.find(eq => eq.id === item.equipment_id);
      if (!equipment) return total;
      
      let itemTotal = 0;
      
      // Weekly pricing logic
      // 1-4 days: daily rate
      // 5-7 days: weekly rate (flat)
      // 8+ days: calculate full weeks + remaining days
      
      if (days <= 4) {
        // Simple daily rate for 1-4 days
        itemTotal = equipment.price_per_day * item.quantity * days;
      } else if (days >= 5 && days <= 7) {
        // Weekly rate applies for 5-7 days
        const weeklyRate = equipment.price_per_week || (equipment.price_per_day * 5);
        itemTotal = weeklyRate * item.quantity;
      } else {
        // For 8+ days: calculate full weeks + remaining days
        const weeklyRate = equipment.price_per_week || (equipment.price_per_day * 5);
        const fullWeeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        
        // Calculate cost for full weeks
        const weeksCost = fullWeeks * weeklyRate * item.quantity;
        
        // Calculate cost for remaining days
        let remainingCost = 0;
        if (remainingDays >= 1 && remainingDays <= 4) {
          // Remaining days charged at daily rate
          remainingCost = remainingDays * equipment.price_per_day * item.quantity;
        } else if (remainingDays >= 5) {
          // If remaining days are 5-7, charge weekly rate
          remainingCost = weeklyRate * item.quantity;
        }
        
        itemTotal = weeksCost + remainingCost;
      }
      
      return total + itemTotal;
    }, 0);
    
    // Add delivery fee
    const deliveryFee = calculateDeliveryFee(bookingData.startDate, days);
    
    return equipmentTotal + deliveryFee;
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
    
    // Phone is required
    if (!phone?.trim()) {
      errors.push('Phone number is required.');
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
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

      // Validate delivery slot
      if (!bookingData.deliverySlot) {
        toast({ 
          title: 'Validation Error', 
          description: 'Please select a delivery time slot.', 
          variant: 'destructive' 
        });
        return;
      }

      let bookingId: string | null = null;
      
      try {
        // Step 1: Create guest booking record (no payment, no stock reservation yet)
        const bookingPayload = {
          user_id: user?.id || null, // Allow null for guest bookings
          start_date: bookingData.startDate,
          end_date: bookingData.endDate,
          total_amount: calculateTotal(),
          status: 'pending_admin_review', // New status for guest bookings
          customer_name: bookingData.customerInfo.name.trim(),
          customer_email: bookingData.customerInfo.email.trim().toLowerCase(),
          customer_phone: bookingData.customerInfo.phone?.trim() || '',
          customer_address: bookingData.customerInfo.address?.trim() || '',
          room_number: bookingData.customerInfo.room_number?.trim() || null,
          customer_comment: bookingData.customerInfo.comment?.trim() || null,
          delivery_slot: bookingData.deliverySlot,
          pickup_slot: bookingData.pickupSlot,
          payment_status: 'pending'
        };

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert(bookingPayload)
          .select()
          .single();

        if (bookingError || !booking) {
          throw new Error(`Failed to create reservation: ${bookingError?.message || 'Unknown error'}`);
        }
        
        bookingId = booking.id;

        // Step 2: Create booking items
        const bookingItems = bookingData.items.map(item => ({
          booking_id: booking.id,
          equipment_id: item.equipment_id,
          equipment_name: item.equipment_name,
          equipment_price: item.equipment_price,
          quantity: item.quantity,
          subtotal: item.subtotal
        }));

        const { error: itemsError } = await supabase
          .from('booking_items')
          .insert(bookingItems);

        if (itemsError) {
          throw new Error(`Failed to create booking items: ${itemsError.message}`);
        }

        // Step 3: Send reservation confirmation email
        try {
          const { error: emailError } = await supabase.functions.invoke('send-reservation-email', {
            body: {
              booking_id: booking.id,
              customer_name: bookingData.customerInfo.name.trim(),
              customer_email: bookingData.customerInfo.email.trim().toLowerCase(),
              start_date: bookingData.startDate,
              end_date: bookingData.endDate,
              delivery_slot: bookingData.deliverySlot,
              total_amount: calculateTotal(),
              items: bookingData.items
            }
          });

          if (emailError) {
            console.warn('Failed to send reservation email:', emailError);
            // Don't fail the booking if email fails
          }
        } catch (emailErr) {
          console.warn('Error sending reservation email:', emailErr);
        }

        // Success: Reset booking data
        setBookingData(initialBookingData);
        clearCart();
        
        toast({ 
          title: 'Reservation Received!', 
          description: 'Your reservation has been submitted. You will receive a confirmation email shortly. Our team will review your reservation and send you a payment link within 24 hours.', 
          variant: 'default',
          duration: 8000
        });
        
        // Redirect to home page after short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);

      } catch (error: any) {
        console.error('Error during reservation submission:', error);
        
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
          title: 'Reservation Failed', 
          description: errorMessage, 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      console.error('Unexpected error during reservation submission:', error);
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
