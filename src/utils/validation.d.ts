/**
 * Validation utilities using Zod for type-safe validation
 */
import { z } from 'zod';
export declare const imageUploadSchema: z.ZodObject<{
    file: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodType<File, z.ZodTypeDef, File>, File, File>, File, File>, File, File>;
    alt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    file: File;
    alt?: string | undefined;
}, {
    file: File;
    alt?: string | undefined;
}>;
export declare const emailSchema: z.ZodString;
export declare const phoneSchema: z.ZodString;
export declare const nameSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const customerSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    address: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    phone: string;
    address: string;
    name: string;
    status: "active" | "inactive";
    id?: string | undefined;
    notes?: string | undefined;
}, {
    email: string;
    phone: string;
    address: string;
    name: string;
    id?: string | undefined;
    status?: "active" | "inactive" | undefined;
    notes?: string | undefined;
}>;
export declare const deliverySchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    customer_id: z.ZodString;
    delivery_address: z.ZodString;
    start_date: z.ZodString;
    end_date: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
    equipment_type: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    driver_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    start_date: string;
    status: "pending" | "cancelled" | "completed" | "in_progress";
    customer_id: string;
    delivery_address: string;
    equipment_type: string;
    id?: string | undefined;
    end_date?: string | undefined;
    notes?: string | undefined;
    driver_id?: string | undefined;
}, {
    start_date: string;
    customer_id: string;
    delivery_address: string;
    equipment_type: string;
    id?: string | undefined;
    end_date?: string | undefined;
    status?: "pending" | "cancelled" | "completed" | "in_progress" | undefined;
    notes?: string | undefined;
    driver_id?: string | undefined;
}>;
export declare const equipmentSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodString;
    price_per_day: z.ZodNumber;
    availability_status: z.ZodDefault<z.ZodEnum<["available", "rented", "maintenance"]>>;
    images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    availability_status: "available" | "rented" | "maintenance";
    category: string;
    price_per_day: number;
    id?: string | undefined;
    description?: string | undefined;
    images?: string[] | undefined;
}, {
    name: string;
    category: string;
    price_per_day: number;
    id?: string | undefined;
    description?: string | undefined;
    availability_status?: "available" | "rented" | "maintenance" | undefined;
    images?: string[] | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    name: z.ZodString;
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    phone: string;
    name: string;
    password: string;
    confirmPassword: string;
}, {
    email: string;
    phone: string;
    name: string;
    password: string;
    confirmPassword: string;
}>, {
    email: string;
    phone: string;
    name: string;
    password: string;
    confirmPassword: string;
}, {
    email: string;
    phone: string;
    name: string;
    password: string;
    confirmPassword: string;
}>;
export declare const contactFormSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    subject: z.ZodString;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    message: string;
    subject: string;
    phone?: string | undefined;
}, {
    email: string;
    name: string;
    message: string;
    subject: string;
    phone?: string | undefined;
}>;
export declare const searchSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    offset: number;
    limit: number;
    status?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    date_from?: string | undefined;
    date_to?: string | undefined;
}, {
    offset?: number | undefined;
    status?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    date_from?: string | undefined;
    date_to?: string | undefined;
    limit?: number | undefined;
}>;
export declare const envSchema: z.ZodObject<{
    VITE_SUPABASE_URL: z.ZodString;
    VITE_SUPABASE_ANON_KEY: z.ZodString;
    VITE_CLOUDFLARE_IMAGES_HASH: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_CLOUDFLARE_IMAGES_HASH?: string | undefined;
}, {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_CLOUDFLARE_IMAGES_HASH?: string | undefined;
}>;
export declare const validateImageUpload: (data: unknown) => z.SafeParseReturnType<{
    file: File;
    alt?: string | undefined;
}, {
    file: File;
    alt?: string | undefined;
}>;
export declare const validateCustomer: (data: unknown) => z.SafeParseReturnType<{
    email: string;
    phone: string;
    address: string;
    name: string;
    id?: string | undefined;
    status?: "active" | "inactive" | undefined;
    notes?: string | undefined;
}, {
    email: string;
    phone: string;
    address: string;
    name: string;
    status: "active" | "inactive";
    id?: string | undefined;
    notes?: string | undefined;
}>;
export declare const validateDelivery: (data: unknown) => z.SafeParseReturnType<{
    start_date: string;
    customer_id: string;
    delivery_address: string;
    equipment_type: string;
    id?: string | undefined;
    end_date?: string | undefined;
    status?: "pending" | "cancelled" | "completed" | "in_progress" | undefined;
    notes?: string | undefined;
    driver_id?: string | undefined;
}, {
    start_date: string;
    status: "pending" | "cancelled" | "completed" | "in_progress";
    customer_id: string;
    delivery_address: string;
    equipment_type: string;
    id?: string | undefined;
    end_date?: string | undefined;
    notes?: string | undefined;
    driver_id?: string | undefined;
}>;
export declare const validateEquipment: (data: unknown) => z.SafeParseReturnType<{
    name: string;
    category: string;
    price_per_day: number;
    id?: string | undefined;
    description?: string | undefined;
    availability_status?: "available" | "rented" | "maintenance" | undefined;
    images?: string[] | undefined;
}, {
    name: string;
    availability_status: "available" | "rented" | "maintenance";
    category: string;
    price_per_day: number;
    id?: string | undefined;
    description?: string | undefined;
    images?: string[] | undefined;
}>;
export declare const validateLogin: (data: unknown) => z.SafeParseReturnType<{
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const validateRegister: (data: unknown) => z.SafeParseReturnType<{
    email: string;
    phone: string;
    name: string;
    password: string;
    confirmPassword: string;
}, {
    email: string;
    phone: string;
    name: string;
    password: string;
    confirmPassword: string;
}>;
export declare const validateContactForm: (data: unknown) => z.SafeParseReturnType<{
    email: string;
    name: string;
    message: string;
    subject: string;
    phone?: string | undefined;
}, {
    email: string;
    name: string;
    message: string;
    subject: string;
    phone?: string | undefined;
}>;
export declare const validateSearch: (data: unknown) => z.SafeParseReturnType<{
    offset?: number | undefined;
    status?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    date_from?: string | undefined;
    date_to?: string | undefined;
    limit?: number | undefined;
}, {
    offset: number;
    limit: number;
    status?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    date_from?: string | undefined;
    date_to?: string | undefined;
}>;
export declare const validateEnv: (data: unknown) => z.SafeParseReturnType<{
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_CLOUDFLARE_IMAGES_HASH?: string | undefined;
}, {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_CLOUDFLARE_IMAGES_HASH?: string | undefined;
}>;
export declare const isValidUUID: (value: string) => boolean;
export declare const isValidDate: (value: string) => boolean;
export declare const isValidImageType: (file: File) => boolean;
export declare const isValidImageSize: (file: File, maxSizeMB?: number) => boolean;
export declare const sanitizeString: (input: string) => string;
export declare const sanitizeEmail: (email: string) => string;
export declare const sanitizePhone: (phone: string) => string;
export declare const formatValidationErrors: (errors: z.ZodError) => Record<string, string>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type DeliveryInput = z.infer<typeof deliverySchema>;
export type EquipmentInput = z.infer<typeof equipmentSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
