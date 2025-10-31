
import { Product } from '@/types/types';

export interface BookingItem {
  equipment_name: string;
  quantity: number;
  equipment_price: number;
  equipment_id: string;
  subtotal: number;
  equipment?: Product; // Added to reflect nested equipment data from Supabase query
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'out_for_delivery' | 'delivered' | 'undeliverable';

export interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  room_number?: string | null;
  customer_comment: string | null;
  user_id: string | null; // Nullable to support guest bookings
  start_date: string;
  end_date: string;
  status: BookingStatus;
  total_amount: number;
  delivery_failure_reason: string | null;
  booking_items: BookingItem[];
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarViewProps {
  bookings: Booking[];
  viewMode: 'day' | 'week';
  onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void;
  onCreateBooking: () => void;
  onEdit: (booking: Booking) => void;
}
