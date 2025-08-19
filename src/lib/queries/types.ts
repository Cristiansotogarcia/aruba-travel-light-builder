export interface Booking {
  id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'out_for_delivery' | 'delivered' | 'undeliverable';
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_comment: string | null;

  user_id: string;

  assigned_to: string | null;
  delivery_failure_reason: string | null;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at?: string;
}

export interface Equipment {
  id: string;
  user_id: string;
  name: string;
  type: 'kayak' | 'snorkel' | 'paddle-board';
  daily_rate: number;
  available: boolean;
  created_at?: string;
}