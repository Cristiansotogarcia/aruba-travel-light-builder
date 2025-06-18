
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, BookingFormData, BookingItem, CustomerInfo, AvailabilityStatus, SupabaseBookingData } from '../types/types';
import { SupabaseBookingItemData } from '../types/booking'; // Import from the new file
import { useToast } from '@/components/ui/use-toast';

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
    address: ''
  }
};

const useBooking = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [bookingData, setBookingData] = useState<BookingFormData>(initialBookingData);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
        availability: boolean;
        created_at?: string;
        updated_at?: string;
      };

      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price_per_day, category, images, availability, created_at, updated_at');

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
          // Convert availability boolean to stock_quantity (simulate stock based on availability)
          const stockQuantity = item.availability ? 10 : 0; // Default to 10 if available, 0 if not
          
          let availability_status: AvailabilityStatus; // Renamed status to availability_status for clarity and consistency with type
          if (stockQuantity <= 0) {
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
            image_url: item.images?.[0] || '', // Use first image or empty string
            stock_quantity: stockQuantity,
            availability_status: availability_status, // Added availability_status to Product object
            created_at: item.created_at,
            updated_at: item.updated_at
          };
          
          return product;
        });
        
        setProducts(productsWithStatus);
      }
    };

    fetchProducts();
  }, [toast]);

  const addEquipment = (equipment: Product, quantity: number, selectedDate: Date | undefined) => {
    if (!selectedDate) {
      toast({
        title: 'Date Not Selected',
        description: 'Please select a date before adding equipment.',
        variant: 'destructive',
      });
      return;
    }

    if (!equipment || !equipment.id) {
      toast({
        title: 'Equipment Not Selected',
        description: 'Please select valid equipment.',
        variant: 'destructive',
      });
      return;
    }

    // Stock check (assuming equipment.stock_quantity is available)
    if (equipment.stock_quantity < quantity) {
      toast({
        title: 'Insufficient Stock',
        description: `Only ${equipment.stock_quantity} units of ${equipment.name} available. You requested ${quantity}.`,
        variant: 'destructive',
      });
      return;
    }

    setBookingData(prev => {
      const existingItemInCart = prev.items.find(item => item.equipment_id === equipment.id);
      const price = equipment.price_per_day ?? 0;

      if (existingItemInCart) {
        // Check stock for additional quantity
        if (equipment.stock_quantity < existingItemInCart.quantity + quantity) {
          toast({
            title: 'Insufficient Stock for Cart Update',
            description: `Cannot add ${quantity} more unit(s) of ${equipment.name}. Available: ${equipment.stock_quantity}, In cart: ${existingItemInCart.quantity}.`,
            variant: 'destructive',
          });
          return prev; // Return previous state if stock is insufficient
        }
        return {
          ...prev,
          items: prev.items.map(item =>
            item.equipment_id === equipment.id
              ? { 
                  ...item, 
                  quantity: item.quantity + quantity, 
                  subtotal: price * (item.quantity + quantity) 
                }
              : item
          )
        };
      } else {
        const newBookingItem: BookingItem = {
          equipment_id: equipment.id,
          quantity: quantity,
          equipment_price: price, 
          equipment_name: equipment.name,
          subtotal: price * quantity
        };
        return {
          ...prev,
          items: [...prev.items, newBookingItem]
        };
      }
    });

    // Reset selection (optional, depends on UI flow)
    // setSelectedEquipment(''); 
    // setQuantity(1);
  };

  const removeEquipment = (equipmentId: string) => {
    setBookingData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.equipment_id !== equipmentId) // Changed from product_id
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

    try {
      const days = calculateDays();
      if (days <= 0) {
        toast({ title: 'Invalid Dates', description: 'End date must be after start date.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const bookingPayload: Omit<SupabaseBookingData, 'user_id' | 'created_at' | 'total_price' | 'customer_address'> & { customer_address: string } = {
        start_date: bookingData.startDate,
        end_date: bookingData.endDate,
        customer_name: bookingData.customerInfo.name,
        customer_email: bookingData.customerInfo.email,
        customer_phone: bookingData.customerInfo.phone,
        customer_address: bookingData.customerInfo.address, // Ensured as string
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
        // Ensure all fields from SupabaseBookingItemData are mapped
        // id is auto-generated by DB, created_at is auto-generated by DB
        // product_id is not in BookingItem, using equipment_id instead as per SupabaseBookingItemData definition in types.ts
        // however, SupabaseBookingItemData also has equipment_id, equipment_name, equipment_price, subtotal.
        // It seems there's a slight confusion between product_id and equipment_id in SupabaseBookingItemData.
        // Assuming equipment_* fields are the correct ones to use based on BookingItem and the error message.
        // The error says it's missing equipment_name, equipment_price, subtotal.
        // SupabaseBookingItemData has: booking_id, product_id, quantity, price_at_booking, equipment_id, equipment_name, equipment_price, subtotal
        // BookingItem (CalendarBookingItemType) has: equipment_name, quantity, equipment_price, equipment_id, subtotal
        // We will map based on BookingItem and what SupabaseBookingItemData expects for the insert.
        booking_id: bookingInsertData.id,
        equipment_id: item.equipment_id, // from BookingItem
        equipment_name: item.equipment_name, // from BookingItem
        quantity: item.quantity, // from BookingItem
        equipment_price: item.equipment_price, // from BookingItem, used for the 'equipment_price' column
        price_at_booking: item.equipment_price, // from BookingItem, used for the 'price_at_booking' column
        subtotal: item.subtotal, // from BookingItem
        product_id: item.equipment_id, // Assuming product_id is the same as equipment_id for now, needs clarification if they differ
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

      toast({ title: 'Booking Successful', description: 'Your booking has been created.', variant: 'default' }); // Changed variant to 'default'
      setBookingData(initialBookingData);
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
    addEquipment,
    removeEquipment,
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
