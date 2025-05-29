
export interface BookingItem {
  equipment_name: string;
  quantity: number;
  equipment_price?: number;
  subtotal: number;
  equipment_id?: string;
}

export interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  booking_items?: BookingItem[];
}

export interface CalendarViewProps {
  bookings: Booking[];
  viewMode: 'day' | 'week';
  onStatusUpdate: (bookingId: string, newStatus: string) => void;
  onCreateBooking: () => void;
}
