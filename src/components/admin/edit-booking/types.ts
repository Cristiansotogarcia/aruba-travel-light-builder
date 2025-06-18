
import { Booking as CalendarBooking, BookingItem as CalendarBookingItem } from '@/components/admin/calendar/types';

// This file can define types specific to the edit booking process,
// potentially extending or adapting the canonical Booking/BookingItem types.

// Example: If you need a specific version of BookingItem for the edit form:
export interface EditBookingItem extends CalendarBookingItem {
  // Add any additional properties specific to editing an item
  original_quantity?: number;
}

// Example: If the Booking type for editing needs slight modifications:
export interface EditBooking extends CalendarBooking {
  // Add any additional properties specific to editing a booking
  is_editing?: boolean;
  delivery_failure_reason?: string | null;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

// You can also re-export the canonical types if they are used directly
// without modification in the edit booking context.
export type Booking = CalendarBooking;
export type BookingItem = CalendarBookingItem;
