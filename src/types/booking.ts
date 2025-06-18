
// Additional booking-related types for the useBooking hook
export interface SupabaseBookingItemData {
  id?: string;
  booking_id: string;
  equipment_id: string;
  equipment_name: string;
  quantity: number;
  equipment_price: number;
  price_at_booking: number;
  subtotal: number;
  product_id: string;
  created_at?: string;
}
