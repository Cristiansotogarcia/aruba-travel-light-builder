
export interface BookingItem {
  equipment_name: string;
  quantity: number;
  subtotal: number;
  equipment_id: string;
  equipment_price: number;
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
  delivery_failure_reason?: string | null;
  booking_items?: BookingItem[];
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}
