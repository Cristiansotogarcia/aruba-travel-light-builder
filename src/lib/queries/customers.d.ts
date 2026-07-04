import { Booking } from './types';
export declare const getCustomer: (userId: string, bookingId: string) => Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<{
    assigned_to: string | null;
    created_at: string;
    customer_address: string;
    customer_email: string;
    customer_name: string;
    customer_phone: string;
    customer_comment: string | null;
    delivery_failure_reason: string | null;
    end_date: string;
    id: string;
    start_date: string;
    status: string;
    total_amount: number;
    updated_at: string;
}>>;
export declare const searchCustomers: (userId: string, searchTerm: string) => Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<{
    assigned_to: string | null;
    created_at: string;
    customer_address: string;
    customer_email: string;
    customer_name: string;
    customer_phone: string;
    customer_comment: string | null;
    delivery_failure_reason: string | null;
    end_date: string;
    id: string;
    start_date: string;
    status: string;
    total_amount: number;
    updated_at: string;
}[]>>;
export declare const updateCustomer: (userId: string, updates: Partial<Booking> & {
    id: string;
}) => Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<null>>;
