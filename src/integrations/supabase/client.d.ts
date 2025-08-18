import { createClient as supabaseCreateClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<Database, "public", {
    Tables: {
        booking_items: {
            Row: {
                booking_id: string;
                created_at: string;
                equipment_id: string;
                equipment_name: string;
                equipment_price: number;
                id: string;
                quantity: number;
                subtotal: number;
            };
            Insert: {
                booking_id: string;
                created_at?: string;
                equipment_id: string;
                equipment_name: string;
                equipment_price: number;
                id?: string;
                quantity: number;
                subtotal: number;
            };
            Update: {
                booking_id?: string;
                created_at?: string;
                equipment_id?: string;
                equipment_name?: string;
                equipment_price?: number;
                id?: string;
                quantity?: number;
                subtotal?: number;
            };
            Relationships: [{
                foreignKeyName: "booking_items_booking_id_fkey";
                columns: ["booking_id"];
                isOneToOne: false;
                referencedRelation: "bookings";
                referencedColumns: ["id"];
            }];
        };
        bookings: {
            Row: {
                assigned_to: string | null;
                created_at: string;
                customer_address: string;
                customer_email: string;
                customer_name: string;
                customer_phone: string;
                delivery_failure_reason: string | null;
                end_date: string;
                id: string;
                start_date: string;
                status: string;
                total_amount: number;
                updated_at: string;
            };
            Insert: {
                assigned_to?: string | null;
                created_at?: string;
                customer_address: string;
                customer_email: string;
                customer_name: string;
                customer_phone: string;
                delivery_failure_reason?: string | null;
                end_date: string;
                id?: string;
                start_date: string;
                status?: string;
                total_amount: number;
                updated_at?: string;
            };
            Update: {
                assigned_to?: string | null;
                created_at?: string;
                customer_address?: string;
                customer_email?: string;
                customer_name?: string;
                customer_phone?: string;
                delivery_failure_reason?: string | null;
                end_date?: string;
                id?: string;
                start_date?: string;
                status?: string;
                total_amount?: number;
                updated_at?: string;
            };
            Relationships: [];
        };
        component_visibility: {
            Row: {
                component_name: string;
                created_at: string;
                id: string;
                is_visible: boolean;
                role: Database["public"]["Enums"]["app_role"];
                updated_at: string;
            };
            Insert: {
                component_name: string;
                created_at?: string;
                id?: string;
                is_visible?: boolean;
                role: Database["public"]["Enums"]["app_role"];
                updated_at?: string;
            };
            Update: {
                component_name?: string;
                created_at?: string;
                id?: string;
                is_visible?: boolean;
                role?: Database["public"]["Enums"]["app_role"];
                updated_at?: string;
            };
            Relationships: [];
        };
        content_blocks: {
            Row: {
                block_key: string;
                block_type: string;
                content: string | null;
                created_at: string;
                id: string;
                is_active: boolean | null;
                metadata: import("@/types/supabase").Json | null;
                page_slug: string;
                sort_order: number | null;
                title: string;
                updated_at: string;
            };
            Insert: {
                block_key: string;
                block_type?: string;
                content?: string | null;
                created_at?: string;
                id?: string;
                is_active?: boolean | null;
                metadata?: import("@/types/supabase").Json | null;
                page_slug: string;
                sort_order?: number | null;
                title: string;
                updated_at?: string;
            };
            Update: {
                block_key?: string;
                block_type?: string;
                content?: string | null;
                created_at?: string;
                id?: string;
                is_active?: boolean | null;
                metadata?: import("@/types/supabase").Json | null;
                page_slug?: string;
                sort_order?: number | null;
                title?: string;
                updated_at?: string;
            };
            Relationships: [];
        };
        content_images: {
            Row: {
                alt_text: string | null;
                created_at: string;
                file_path: string;
                file_size: number | null;
                id: string;
                image_key: string;
                mime_type: string | null;
            };
            Insert: {
                alt_text?: string | null;
                created_at?: string;
                file_path: string;
                file_size?: number | null;
                id?: string;
                image_key: string;
                mime_type?: string | null;
            };
            Update: {
                alt_text?: string | null;
                created_at?: string;
                file_path?: string;
                file_size?: number | null;
                id?: string;
                image_key?: string;
                mime_type?: string | null;
            };
            Relationships: [];
        };
        equipment: {
            Row: {
                availability: boolean;
                availability_status: string | null;
                category: string | null;
                category_id: string | null;
                created_at: string;
                description: string | null;
                featured: boolean;
                id: string;
                images: string[] | null;
                name: string;
                price_per_day: number;
                sort_order: number | null;
                stock_quantity: number;
                sub_category: string | null;
                sub_category_id: string | null;
                updated_at: string;
            };
            Insert: {
                availability?: boolean;
                availability_status?: string | null;
                category?: string | null;
                category_id?: string | null;
                created_at?: string;
                description?: string | null;
                featured?: boolean;
                id?: string;
                images?: string[] | null;
                name: string;
                price_per_day?: number;
                sort_order?: number | null;
                stock_quantity?: number;
                sub_category?: string | null;
                sub_category_id?: string | null;
                updated_at?: string;
            };
            Update: {
                availability?: boolean;
                availability_status?: string | null;
                category?: string | null;
                category_id?: string | null;
                created_at?: string;
                description?: string | null;
                featured?: boolean;
                id?: string;
                images?: string[] | null;
                name?: string;
                price_per_day?: number;
                sort_order?: number | null;
                stock_quantity?: number;
                sub_category?: string | null;
                sub_category_id?: string | null;
                updated_at?: string;
            };
            Relationships: [{
                foreignKeyName: "equipment_category_id_fkey";
                columns: ["category_id"];
                isOneToOne: false;
                referencedRelation: "equipment_category";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "equipment_sub_category_id_fkey";
                columns: ["sub_category_id"];
                isOneToOne: false;
                referencedRelation: "equipment_sub_category";
                referencedColumns: ["id"];
            }];
        };
        equipment_category: {
            Row: {
                created_at: string | null;
                description: string | null;
                id: string;
                name: string;
                sort_order: number | null;
                updated_at: string | null;
            };
            Insert: {
                created_at?: string | null;
                description?: string | null;
                id?: string;
                name: string;
                sort_order?: number | null;
                updated_at?: string | null;
            };
            Update: {
                created_at?: string | null;
                description?: string | null;
                id?: string;
                name?: string;
                sort_order?: number | null;
                updated_at?: string | null;
            };
            Relationships: [];
        };
        equipment_sub_category: {
            Row: {
                category_id: string | null;
                created_at: string | null;
                id: string;
                name: string;
                sort_order: number | null;
                updated_at: string | null;
            };
            Insert: {
                category_id?: string | null;
                created_at?: string | null;
                id?: string;
                name: string;
                sort_order?: number | null;
                updated_at?: string | null;
            };
            Update: {
                category_id?: string | null;
                created_at?: string | null;
                id?: string;
                name?: string;
                sort_order?: number | null;
                updated_at?: string | null;
            };
            Relationships: [{
                foreignKeyName: "equipment_sub_category_category_id_fkey";
                columns: ["category_id"];
                isOneToOne: false;
                referencedRelation: "equipment_category";
                referencedColumns: ["id"];
            }];
        };
        products: {
            Row: {
                availability: boolean;
                category: string;
                created_at: string;
                description: string | null;
                featured: boolean;
                id: string;
                images: string[] | null;
                name: string;
                price_per_day: number;
                stock_quantity: number;
                updated_at: string;
            };
            Insert: {
                availability?: boolean;
                category: string;
                created_at?: string;
                description?: string | null;
                featured?: boolean;
                id?: string;
                images?: string[] | null;
                name: string;
                price_per_day?: number;
                stock_quantity?: number;
                updated_at?: string;
            };
            Update: {
                availability?: boolean;
                category?: string;
                created_at?: string;
                description?: string | null;
                featured?: boolean;
                id?: string;
                images?: string[] | null;
                name?: string;
                price_per_day?: number;
                stock_quantity?: number;
                updated_at?: string;
            };
            Relationships: [];
        };
        profiles: {
            Row: {
                created_at: string | null;
                email: string | null;
                id: string;
                is_deactivated: boolean | null;
                name: string;
                needs_password_change: boolean | null;
                role: Database["public"]["Enums"]["app_role"];
                updated_at: string | null;
            };
            Insert: {
                created_at?: string | null;
                email?: string | null;
                id: string;
                is_deactivated?: boolean | null;
                name: string;
                needs_password_change?: boolean | null;
                role?: Database["public"]["Enums"]["app_role"];
                updated_at?: string | null;
            };
            Update: {
                created_at?: string | null;
                email?: string | null;
                id?: string;
                is_deactivated?: boolean | null;
                name?: string;
                needs_password_change?: boolean | null;
                role?: Database["public"]["Enums"]["app_role"];
                updated_at?: string | null;
            };
            Relationships: [];
        };
        user_sessions: {
            Row: {
                created_at: string;
                id: string;
                ip_address: string | null;
                is_active: boolean | null;
                last_activity: string;
                session_token: string;
                user_agent: string | null;
                user_id: string | null;
            };
            Insert: {
                created_at?: string;
                id?: string;
                ip_address?: string | null;
                is_active?: boolean | null;
                last_activity?: string;
                session_token: string;
                user_agent?: string | null;
                user_id?: string | null;
            };
            Update: {
                created_at?: string;
                id?: string;
                ip_address?: string | null;
                is_active?: boolean | null;
                last_activity?: string;
                session_token?: string;
                user_agent?: string | null;
                user_id?: string | null;
            };
            Relationships: [{
                foreignKeyName: "user_sessions_user_id_fkey";
                columns: ["user_id"];
                isOneToOne: false;
                referencedRelation: "profiles";
                referencedColumns: ["id"];
            }];
        };
        user_temp_passwords: {
            Row: {
                created_at: string;
                expires_at: string;
                id: string;
                is_used: boolean;
                temp_password: string;
                user_id: string;
            };
            Insert: {
                created_at?: string;
                expires_at?: string;
                id?: string;
                is_used?: boolean;
                temp_password: string;
                user_id: string;
            };
            Update: {
                created_at?: string;
                expires_at?: string;
                id?: string;
                is_used?: boolean;
                temp_password?: string;
                user_id?: string;
            };
            Relationships: [];
        };
    };
    Views: { [_ in never]: never; };
    Functions: {
        cleanup_expired_temp_passwords: {
            Args: Record<PropertyKey, never>;
            Returns: undefined;
        };
        get_current_user_role: {
            Args: Record<PropertyKey, never>;
            Returns: string;
        };
    };
    Enums: {
        app_role: "SuperUser" | "Admin" | "Booker" | "Driver";
    };
    CompositeTypes: { [_ in never]: never; };
}>;
export { supabaseCreateClient as createClient };
