/**
 * Validation utilities using Zod for type-safe validation
 */
import { z } from 'zod';
// File validation schemas
export const imageUploadSchema = z.object({
    file: z.instanceof(File)
        .refine(file => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
        .refine(file => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type), 'Only JPEG, PNG, WebP, and GIF images are allowed')
        .refine(file => file.name.length <= 255, 'Filename must be less than 255 characters'),
    alt: z.string().min(1).max(200).optional()
});
// User input validation schemas
export const emailSchema = z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required');
export const phoneSchema = z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .min(1, 'Phone number is required');
export const nameSchema = z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-\']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');
export const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');
// Business entity validation schemas
export const customerSchema = z.object({
    id: z.string().uuid().optional(),
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    address: z.string().min(1, 'Address is required').max(500, 'Address must be less than 500 characters'),
    notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
    status: z.enum(['active', 'inactive']).default('active')
});
export const deliverySchema = z.object({
    id: z.string().uuid().optional(),
    customer_id: z.string().uuid('Invalid customer ID'),
    delivery_address: z.string().min(1, 'Delivery address is required').max(500),
    start_date: z.string().datetime('Invalid date format'),
    end_date: z.string().datetime('Invalid date format').optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
    equipment_type: z.string().min(1, 'Equipment type is required').max(100),
    notes: z.string().max(1000).optional(),
    driver_id: z.string().uuid('Invalid driver ID').optional()
});
export const equipmentSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, 'Equipment name is required').max(100),
    description: z.string().max(500).optional(),
    category: z.string().min(1, 'Category is required').max(50),
    price_per_day: z.number().min(0, 'Price must be positive'),
    availability_status: z.enum(['available', 'rented', 'maintenance']).default('available'),
    image_url: z.string().url('Invalid image URL').optional()
});
// Form validation schemas
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required')
});
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    name: nameSchema,
    phone: phoneSchema
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
});
export const contactFormSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema.optional(),
    subject: z.string().min(1, 'Subject is required').max(200),
    message: z.string().min(10, 'Message must be at least 10 characters').max(2000)
});
// Search and filter schemas
export const searchSchema = z.object({
    query: z.string().max(100, 'Search query too long').optional(),
    category: z.string().max(50).optional(),
    status: z.string().max(20).optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0)
});
// Environment variable validation
export const envSchema = z.object({
    VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
    VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
    VITE_CLOUDFLARE_IMAGES_HASH: z.string().min(1, 'Cloudflare images hash is required').optional()
});
// Validation helper functions
export const validateImageUpload = (data) => {
    return imageUploadSchema.safeParse(data);
};
export const validateCustomer = (data) => {
    return customerSchema.safeParse(data);
};
export const validateDelivery = (data) => {
    return deliverySchema.safeParse(data);
};
export const validateEquipment = (data) => {
    return equipmentSchema.safeParse(data);
};
export const validateLogin = (data) => {
    return loginSchema.safeParse(data);
};
export const validateRegister = (data) => {
    return registerSchema.safeParse(data);
};
export const validateContactForm = (data) => {
    return contactFormSchema.safeParse(data);
};
export const validateSearch = (data) => {
    return searchSchema.safeParse(data);
};
export const validateEnv = (data) => {
    return envSchema.safeParse(data);
};
// Custom validation functions
export const isValidUUID = (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
};
export const isValidDate = (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString() === value;
};
export const isValidImageType = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    return allowedTypes.includes(file.type);
};
export const isValidImageSize = (file, maxSizeMB = 10) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
};
// Sanitization functions
export const sanitizeString = (input) => {
    return input
        .trim()
        .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
        .substring(0, 1000); // Limit length
};
export const sanitizeEmail = (email) => {
    return email.toLowerCase().trim();
};
export const sanitizePhone = (phone) => {
    return phone.replace(/[^\d\+\-\(\)\s]/g, '').trim();
};
// Validation error formatter
export const formatValidationErrors = (errors) => {
    const formattedErrors = {};
    errors.errors.forEach(error => {
        const path = error.path.join('.');
        formattedErrors[path] = error.message;
    });
    return formattedErrors;
};
