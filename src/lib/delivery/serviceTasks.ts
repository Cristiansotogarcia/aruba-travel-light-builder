import type { Database } from '@/types/supabase';

export type ServiceTaskRow = Database['public']['Tables']['booking_service_tasks']['Row'];
export type DeliverySlipRow = Database['public']['Tables']['delivery_slips']['Row'];
export type ServiceTaskStatus =
  | 'scheduled'
  | 'en_route'
  | 'arrived'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type ServiceTaskType = 'delivery' | 'pickup';

export const getServiceTaskStatusLabel = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'en_route':
      return 'Driver Underway';
    case 'arrived':
      return 'Arrived';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Delivery Issue';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.replace(/_/g, ' ');
  }
};

export const getServiceTaskTypeLabel = (taskType: string) =>
  taskType === 'pickup' ? 'Pickup' : 'Delivery';

export const getServiceTaskBadgeClassName = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'bg-slate-100 text-slate-700';
    case 'en_route':
      return 'bg-blue-100 text-blue-700';
    case 'arrived':
      return 'bg-amber-100 text-amber-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'failed':
      return 'bg-rose-100 text-rose-700';
    case 'cancelled':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const getServiceTaskTypeBadgeClassName = (taskType: string) =>
  taskType === 'pickup'
    ? 'bg-indigo-100 text-indigo-700'
    : 'bg-teal-100 text-teal-700';

export const formatTaskDateTime = (value?: string | null) => {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatTaskTimeRange = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null;
  return `${new Date(start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${new Date(end).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

export const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

export const fromDateTimeLocalValue = (value: string) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

export const isToday = (value?: string | null) => {
  if (!value) return false;
  return new Date(value).toDateString() === new Date().toDateString();
};

export const isFutureTask = (value?: string | null) => {
  if (!value) return false;
  return new Date(value).getTime() > Date.now();
};

export const getDeliverySlipDisplayNumber = (slipNumber: string | null | undefined, fallbackId: string) =>
  slipNumber?.trim() || `DLV-${fallbackId.slice(0, 8).toUpperCase()}`;
