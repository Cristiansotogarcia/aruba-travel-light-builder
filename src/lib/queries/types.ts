export interface Booking {
  id: string;
  customer_id: string;
  equipment_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'confirmed' | 'canceled';
  created_at?: string;
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