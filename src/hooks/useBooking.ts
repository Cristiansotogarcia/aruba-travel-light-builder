
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Product, BookingFormData, CustomerInfo, AvailabilityStatus } from '../types/types';
import { createBookingWithItems, parseAvailabilityConflict } from '@/lib/queries/booking-create';
import { computeDeliveryFee } from '@/lib/pricing/deliveryFee';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useRentalDates } from '@/hooks/useRentalDates';

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
  pickupSlot: undefined,
  fulfillmentMethod: 'delivery'
};

const useBooking = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [bookingData, setBookingData] = useState<BookingFormData>(initialBookingData);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: cartItems, clearCart } = useCart();
  const { startDate: rdStart, endDate: rdEnd } = useRentalDates();

  useEffect(() => {
    setBookingData(prev => ({ ...prev, items: cartItems }));
  }, [cartItems]);

  useEffect(() => {
    if (rdStart && rdEnd) {
      setBookingData(prev =>
        prev.startDate || prev.endDate ? prev : { ...prev, startDate: rdStart, endDate: rdEnd },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdStart, rdEnd]);

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

  const hasCribOrPackAndPlay = () => {
    return bookingData.items.some(item => {
      const name = item.equipment_name.toLowerCase();
      return name.includes('crib') || name.includes('pack and play') || name.includes('pack & play');
    });
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
    
    // Add delivery fee (pickup = $0, delivery = fee based on date/days)
    const deliveryFee = computeDeliveryFee(bookingData.fulfillmentMethod ?? 'delivery', bookingData.startDate, days);

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
      const minDays = 3; // Minimum rental period
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days < minDays) {
        errors.push(`Minimum rental period is ${minDays} days.`);
      }
      if (days > maxDays) {
        errors.push(`Rental period cannot exceed ${maxDays} days.`);
      }
    }
    
    if (bookingData.items.length === 0) {
      errors.push('Please add equipment to your booking.');
    }

    if (bookingData.startDate && isSunday(bookingData.startDate) && !hasCribOrPackAndPlay()) {
      errors.push('Sunday bookings require a crib or pack and play.');
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
    } else if (!/^[+]?[1-9]\d{0,15}$/.test(phone.replace(/[\s()-]/g, ''))) {
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

      const isPickup = (bookingData.fulfillmentMethod ?? 'delivery') === 'pickup';

      // Validate delivery/pickup slots (only required for delivery method)
      if (!isPickup) {
        if (!bookingData.deliverySlot) {
          toast({
            title: 'Validation Error',
            description: 'Please select a delivery time slot.',
            variant: 'destructive'
          });
          return;
        }

        if (!bookingData.pickupSlot) {
          toast({
            title: 'Validation Error',
            description: 'Please select a pickup time slot.',
            variant: 'destructive'
          });
          return;
        }

        if (bookingData.startDate && isSunday(bookingData.startDate) && bookingData.deliverySlot !== 'afternoon') {
          toast({
            title: 'Validation Error',
            description: 'Sunday deliveries are only available in the afternoon.',
            variant: 'destructive'
          });
          return;
        }

        if (bookingData.endDate && isSunday(bookingData.endDate) && bookingData.pickupSlot !== 'morning') {
          toast({
            title: 'Validation Error',
            description: 'Sunday pickups are only available in the morning.',
            variant: 'destructive'
          });
          return;
        }
      }

      let bookingId: string | null = null;

      try {
        const { bookingId: createdId, pickupCode } = await createBookingWithItems({
          startDate: bookingData.startDate,
          endDate: bookingData.endDate,
          totalAmount: calculateTotal(),
          customerInfo: bookingData.customerInfo,
          deliverySlot: bookingData.deliverySlot,
          pickupSlot: bookingData.pickupSlot,
          items: bookingData.items,
          fulfillmentMethod: bookingData.fulfillmentMethod ?? 'delivery',
        });
        bookingId = createdId;
        const booking = { id: createdId };

        // Step 3: Create in-app notification for admin/booker
        try {
          const itemSummary = bookingData.items
            .map(item => `${item.quantity}x ${item.equipment_name}`)
            .join(', ');

          await supabase.from('admin_notifications').insert({
            title: 'New Reservation',
            message: `${bookingData.customerInfo.name} - $${calculateTotal().toFixed(2)} (${itemSummary})`,
            notification_type: 'new_booking',
            priority: 'high',
            booking_id: booking.id,
            is_read: false,
            metadata: {
              customer_name: bookingData.customerInfo.name,
              customer_email: bookingData.customerInfo.email,
              total_amount: calculateTotal(),
              item_count: bookingData.items.length
            }
          });
        } catch (notifErr) {
          console.warn('Failed to create notification:', notifErr);
        }

        // Step 4: Send reservation confirmation email
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

        // Success: Reset booking data and navigate to confirmation page
        setBookingData(initialBookingData);
        clearCart();

        navigate('/reservation/confirmed', {
          state: {
            bookingId: createdId,
            pickupCode,
            fulfillmentMethod: bookingData.fulfillmentMethod ?? 'delivery',
            customerName: bookingData.customerInfo.name,
          },
        });

      } catch (error: unknown) {
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
        const rawMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        const conflicts = parseAvailabilityConflict(rawMessage);
        const errorMessage = conflicts
          ? `Some items are no longer available for your dates: ${conflicts.map((c) => `${c.requested} requested, ${c.available} left`).join('; ')}`
          : rawMessage;
        toast({ title: 'Reservation Failed', description: errorMessage, variant: 'destructive' });
      }
    } catch (error: unknown) {
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
