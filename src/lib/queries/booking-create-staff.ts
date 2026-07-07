import { supabase } from '@/integrations/supabase/client';
import type { BookingItem, CustomerInfo } from '@/types/types';

export type StaffInitialStatus = 'confirmed' | 'pending';

export interface CreateStaffOrderInput {
  startDate: string;
  endDate: string;
  totalAmount: number;
  customerInfo: CustomerInfo;
  deliverySlot?: 'morning' | 'afternoon';
  pickupSlot?: 'morning' | 'afternoon';
  items: BookingItem[];
  fulfillmentMethod: 'delivery' | 'pickup';
  initialStatus: StaffInitialStatus;
}

export interface StaffOrderResult {
  bookingId: string;
  pickupCode: string | null;
  status: StaffInitialStatus;
}

// Builds the RPC args. Mirrors buildCreateBookingArgs from booking-create.ts but
// targets create_booking_as_staff (adds p_initial_status). Kept separate so the
// public flow and the staff flow can diverge without stepping on each other.
export function buildStaffOrderArgs(input: CreateStaffOrderInput) {
  return {
    p_booking: {
      start_date: input.startDate,
      end_date: input.endDate,
      total_amount: input.totalAmount,
      customer_name: input.customerInfo.name.trim(),
      customer_email: input.customerInfo.email.trim().toLowerCase(),
      customer_phone: input.customerInfo.phone?.trim() || '',
      customer_address: input.customerInfo.address?.trim() || '',
      room_number: input.customerInfo.room_number?.trim() || '',
      customer_comment: input.customerInfo.comment?.trim() || '',
      delivery_slot: input.deliverySlot,
      pickup_slot: input.pickupSlot,
      fulfillment_method: input.fulfillmentMethod,
    },
    p_items: input.items.map((i) => ({
      equipment_id: i.equipment_id,
      equipment_name: i.equipment_name,
      equipment_price: i.equipment_price,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
    p_initial_status: input.initialStatus,
  };
}

export async function createBookingAsStaff(input: CreateStaffOrderInput): Promise<StaffOrderResult> {
  const args = buildStaffOrderArgs(input);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('create_booking_as_staff', args);
  if (error) throw error;
  const row = data as { booking_id: string; pickup_code: string | null; status: StaffInitialStatus };
  return {
    bookingId: row.booking_id,
    pickupCode: row.pickup_code ?? null,
    status: row.status ?? input.initialStatus,
  };
}
