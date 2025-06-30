import type { BookingItem as CalendarBookingItemType, Booking, BookingItem, BookingStatus } from '@/components/admin/calendar/types';
export type AvailabilityStatus = 'Available' | 'Low Stock' | 'Out of Stock';
export interface Product {
    id: string;
    name: string;
    description: string | null | undefined;
    price_per_day: number;
    category: string;
    image_url?: string | null | undefined;
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
}
export interface BookingFormData {
    startDate: string;
    endDate: string;
    items: CalendarBookingItemType[];
    customerInfo: CustomerInfo;
}
export interface SupabaseBookingData {
    user_id?: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_address?: string;
    start_date: string;
    end_date: string;
    total_price: number;
    total_amount: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'out_for_delivery' | 'delivered' | 'undeliverable';
    created_at?: string;
}
export interface SupabaseBookingItemData {
    booking_id: string;
    product_id: string;
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
export type UserRole = 'SuperUser' | 'Admin' | 'Booker' | 'Driver';
