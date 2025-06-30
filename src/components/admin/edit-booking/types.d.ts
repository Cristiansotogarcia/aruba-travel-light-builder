import { Booking as CalendarBooking, BookingItem as CalendarBookingItem } from '@/components/admin/calendar/types';
export interface EditBookingItem extends CalendarBookingItem {
    original_quantity?: number;
}
export interface EditBooking extends CalendarBooking {
    is_editing?: boolean;
    delivery_failure_reason?: string | null;
}
export interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
}
export type Booking = CalendarBooking;
export type BookingItem = CalendarBookingItem;
