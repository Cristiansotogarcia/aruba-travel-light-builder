export interface InvoiceLineItem {
  equipment_id?: string | null;
  equipment_name: string;
  quantity: number;
  equipment_price: number;
  subtotal: number;
}

export interface InvoiceSnapshot {
  id: string;
  booking_id: string;
  payment_record_id: string | null;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string | null;
  rental_start_date: string;
  rental_end_date: string;
  currency_code: string;
  items_total: number;
  delivery_fee: number;
  total_amount: number;
  payment_status: string;
  payment_processed_at: string | null;
  issued_at: string;
  line_items: InvoiceLineItem[];
}

export const SUCCESSFUL_BOOKING_PAYMENT_STATUSES = ['paid', 'completed'] as const;
export const SUCCESSFUL_PAYMENT_RECORD_STATUSES = ['paid', 'completed'] as const;

export const isSuccessfulBookingPaymentStatus = (status: string | null | undefined) =>
  SUCCESSFUL_BOOKING_PAYMENT_STATUSES.includes((status ?? '').toLowerCase() as (typeof SUCCESSFUL_BOOKING_PAYMENT_STATUSES)[number]);

export const isSuccessfulPaymentRecordStatus = (status: string | null | undefined) =>
  SUCCESSFUL_PAYMENT_RECORD_STATUSES.includes((status ?? '').toLowerCase() as (typeof SUCCESSFUL_PAYMENT_RECORD_STATUSES)[number]);

export const getInvoiceDisplayNumber = (invoiceNumber: string | null | undefined, fallbackId: string) =>
  invoiceNumber?.trim() || `TLA-${fallbackId.slice(0, 8).toUpperCase()}`;
