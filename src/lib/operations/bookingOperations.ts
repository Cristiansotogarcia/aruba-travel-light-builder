import type { BookingStatus } from '@/components/admin/calendar/types';
import type { Database } from '@/integrations/supabase/types';

export type BookingRecord = Database['public']['Tables']['bookings']['Row'];
export type BookingRecordUpdate = Database['public']['Tables']['bookings']['Update'];

export type DriverTaskType = 'delivery' | 'pickup';

export interface DriverTaskBookingItem {
  equipment_id: string | null;
  equipment_name: string | null;
  equipment_price: number | null;
  quantity: number | null;
  subtotal: number | null;
}

export interface OperationalBooking
  extends Pick<
    BookingRecord,
    | 'id'
    | 'customer_name'
    | 'customer_email'
    | 'customer_phone'
    | 'customer_address'
    | 'start_date'
    | 'end_date'
    | 'status'
    | 'payment_status'
    | 'total_amount'
    | 'assigned_to'
    | 'assigned_driver_id'
    | 'delivery_failure_reason'
    | 'delivery_scheduled_at'
    | 'pickup_scheduled_at'
    | 'delivered_at'
    | 'picked_up_at'
    | 'updated_at'
  > {
  booking_items?: DriverTaskBookingItem[] | null;
}

export interface DriverTaskModel {
  bookingId: string;
  taskType: DriverTaskType;
  assignedDriverId: string | null;
  scheduledAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  totalAmount: number;
  status: BookingStatus;
  isComplete: boolean;
  bookingItems: DriverTaskBookingItem[];
}

export interface DriverAssignmentOptions {
  deliveryScheduledAt?: string | null;
  pickupScheduledAt?: string | null;
  updatedAt?: string;
}

export interface DriverTaskCompletionOptions {
  occurredAt?: string;
  failureReason?: string | null;
}

export const DRIVER_ASSIGNABLE_STATUSES: BookingStatus[] = [
  'confirmed',
  'out_for_delivery',
  'delivered',
  'undeliverable',
];

export function getAssignedDriverId(booking: {
  assigned_driver_id?: string | null;
  assigned_to?: string | null;
}) {
  return booking.assigned_driver_id ?? booking.assigned_to ?? null;
}

export function getTaskSchedule(booking: Pick<OperationalBooking, 'start_date' | 'end_date' | 'delivery_scheduled_at' | 'pickup_scheduled_at'>, taskType: DriverTaskType) {
  return taskType === 'delivery'
    ? booking.delivery_scheduled_at ?? booking.start_date
    : booking.pickup_scheduled_at ?? booking.end_date;
}

export function isTaskComplete(
  booking: Pick<OperationalBooking, 'status' | 'delivered_at' | 'picked_up_at'>,
  taskType: DriverTaskType,
) {
  if (taskType === 'delivery') {
    return Boolean(booking.delivered_at) || booking.status === 'delivered' || booking.status === 'completed';
  }

  return Boolean(booking.picked_up_at) || booking.status === 'completed';
}

export function canAssignDriver(status: BookingStatus) {
  return DRIVER_ASSIGNABLE_STATUSES.includes(status);
}

export function buildDriverAssignmentUpdate(
  driverId: string | null,
  options: DriverAssignmentOptions = {},
): BookingRecordUpdate {
  return {
    assigned_driver_id: driverId,
    assigned_to: driverId,
    delivery_scheduled_at: options.deliveryScheduledAt ?? null,
    pickup_scheduled_at: options.pickupScheduledAt ?? null,
    updated_at: options.updatedAt ?? new Date().toISOString(),
  };
}

export function buildTaskCompletionUpdate(
  taskType: DriverTaskType,
  options: DriverTaskCompletionOptions = {},
): BookingRecordUpdate {
  const occurredAt = options.occurredAt ?? new Date().toISOString();

  if (taskType === 'delivery') {
    if (options.failureReason) {
      return {
        status: 'undeliverable',
        delivery_failure_reason: options.failureReason,
        updated_at: occurredAt,
      };
    }

    return {
      status: 'delivered',
      delivered_at: occurredAt,
      delivery_failure_reason: null,
      updated_at: occurredAt,
    };
  }

  return {
    status: 'completed',
    picked_up_at: occurredAt,
    updated_at: occurredAt,
  };
}

export function buildTaskStartUpdate(taskType: DriverTaskType, occurredAt = new Date().toISOString()): BookingRecordUpdate {
  if (taskType === 'delivery') {
    return {
      status: 'out_for_delivery',
      updated_at: occurredAt,
    };
  }

  return {
    updated_at: occurredAt,
  };
}

export function buildDriverTasks(booking: OperationalBooking): DriverTaskModel[] {
  const assignedDriverId = getAssignedDriverId(booking);
  const bookingItems = booking.booking_items ?? [];

  return (['delivery', 'pickup'] as const).map((taskType) => ({
    bookingId: booking.id,
    taskType,
    assignedDriverId,
    scheduledAt: getTaskSchedule(booking, taskType),
    customerName: booking.customer_name,
    customerEmail: booking.customer_email,
    customerPhone: booking.customer_phone,
    customerAddress: booking.customer_address,
    totalAmount: Number(booking.total_amount),
    status: booking.status as BookingStatus,
    isComplete: isTaskComplete(booking, taskType),
    bookingItems,
  }));
}
