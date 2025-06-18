// Import types from other modules
import type { BookingItem as CalendarBookingItemType, Booking, BookingItem, BookingStatus } from '@/components/admin/calendar/types';

// Defines the structure for a product available for rental
export type AvailabilityStatus = 'Available' | 'Low Stock' | 'Out of Stock';

export interface Product {
  id: string; // UUID
  name: string;
  description: string | null | undefined;
  price_per_day: number;
  category: string;
  image_url?: string | null | undefined;
  stock_quantity: number; // Made non-optional
  availability_status?: AvailabilityStatus; // Uncommented and made optional
  created_at?: string; // ISO 8601 date string
  updated_at?: string; // ISO 8601 date string
}

// Represents customer information collected in the form
export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

// Represents the structure of the form data within the useBooking hook
export interface BookingFormData {
  startDate: string;
  endDate: string;
  items: CalendarBookingItemType[]; // Use the directly imported alias
  customerInfo: CustomerInfo;
}

// Defines the structure for data submitted to Supabase 'bookings' table
export interface SupabaseBookingData {
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  start_date: string;
  end_date: string;
  total_price: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'out_for_delivery' | 'delivered' | 'undeliverable'; // Updated to match BookingStatus
  created_at?: string;
}

// Defines the structure for data submitted to Supabase 'booking_items' table
export interface SupabaseBookingItemData {
  booking_id: string;
  product_id: string;
  quantity: number;
  price_at_booking: number;
  equipment_id: string;
  equipment_name: string;
  equipment_price: number;
  subtotal: number;
}

// Re-export Booking and BookingItem from the single source of truth
export type { Booking, BookingItem, BookingStatus };

// You can add other shared types here as your project grows.