import type { BookingItem as CalendarBookingItemType, Booking, BookingItem, BookingStatus } from '@/components/admin/calendar/types';
export type AvailabilityStatus = 'Available' | 'Low Stock' | 'Out of Stock' | 'Temporarily Not Available';
export interface Product {
    id: string;
    name: string;
    description: string | null | undefined;
    price_per_day: number;
    price_per_week?: number;
    category: string;
    images: string[];
    stock_quantity: number;
    availability_status?: AvailabilityStatus;
    featured?: boolean;
    created_at?: string;
    updated_at?: string;
}
export interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
    room_number: string;
    comment: string;
}
export interface BookingFormData {
    startDate: string;
    endDate: string;
    items: CalendarBookingItemType[];
    customerInfo: CustomerInfo;
    deliverySlot?: 'morning' | 'afternoon';
    pickupSlot?: 'morning' | 'afternoon';
}
export interface SupabaseBookingData {
    user_id?: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_address?: string;
    room_number?: string | null;
    customer_comment?: string | null;
    start_date: string;
    end_date: string;
    total_price: number;
    total_amount: number;
    status: 'pending' | 'pending_admin_review' | 'confirmed' | 'cancelled' | 'completed' | 'out_for_delivery' | 'delivered' | 'undeliverable' | 'rejected';
    delivery_slot?: 'morning' | 'afternoon';
    pickup_slot?: 'morning' | 'afternoon';
    created_at?: string;
}
export interface SupabaseBookingItemData {
    booking_id: string;
    quantity: number;
    price_at_booking: number;
    equipment_id: string;
    equipment_name: string;
    equipment_price: number;
    subtotal: number;
}
export type { Booking, BookingItem, BookingStatus };
export interface Profile {
    id: string;
    name: string;
    role: UserRole;
    created_at: string | null;
    needs_password_change?: boolean | null;
    email: string | null;
    is_deactivated?: boolean | null;
}
export type UserRole = 'SuperUser' | 'Admin' | 'Booker' | 'Customer' | 'Driver';
