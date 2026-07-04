import { supabase } from '@/integrations/supabase/client';
import type { BookingItem, CustomerInfo } from '@/types/types';

export interface CreateBookingInput {
  startDate: string;
  endDate: string;
  totalAmount: number;
  customerInfo: CustomerInfo;
  deliverySlot?: 'morning' | 'afternoon';
  pickupSlot?: 'morning' | 'afternoon';
  items: BookingItem[];
  fulfillmentMethod?: 'delivery' | 'pickup';
}

export interface AvailabilityConflict {
  equipment_id: string;
  requested: number;
  available: number;
}

export function buildCreateBookingArgs(input: CreateBookingInput) {
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
      fulfillment_method: input.fulfillmentMethod ?? 'delivery',
    },
    p_items: input.items.map((i) => ({
      equipment_id: i.equipment_id,
      equipment_name: i.equipment_name,
      equipment_price: i.equipment_price,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
  };
}

export function parseAvailabilityConflict(message: string): AvailabilityConflict[] | null {
  const marker = 'AVAILABILITY_CONFLICT:';
  const idx = message.indexOf(marker);
  if (idx === -1) return null;
  try {
    return JSON.parse(message.slice(idx + marker.length).trim());
  } catch {
    return null;
  }
}

export async function createBookingWithItems(input: CreateBookingInput): Promise<{ bookingId: string; pickupCode: string | null }> {
  const args = buildCreateBookingArgs(input);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('create_booking_with_items', args);
  if (error) throw error;
  return {
    bookingId: (data as { booking_id: string }).booking_id,
    pickupCode: (data as { pickup_code: string | null }).pickup_code ?? null,
  };
}
