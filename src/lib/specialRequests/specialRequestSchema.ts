import { z } from 'zod';

// Wire values stored in public.special_requests.request_type (see migration
// 20261029200000_special_requests.sql). Keep these in sync with that CHECK
// constraint — the DB is the source of truth for what's allowed.
export const SPECIAL_REQUEST_TYPES = ['general', 'last_minute', 'special_arrangement'] as const;
export type SpecialRequestType = (typeof SPECIAL_REQUEST_TYPES)[number];

export const SPECIAL_REQUEST_TYPE_LABELS: Record<SpecialRequestType, string> = {
  general: 'General inquiry',
  last_minute: 'Last-minute rental',
  special_arrangement: 'Special arrangement',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Length limits mirror the CHECK constraints on public.special_requests so a
// value that passes client validation also passes the DB's RLS WITH CHECK.
export const specialRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  email: z
    .string()
    .trim()
    .min(3, 'Email is required')
    .max(200, 'Email must be 200 characters or fewer')
    .regex(EMAIL_PATTERN, 'Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number must be 30 characters or fewer')
    .optional()
    .or(z.literal('')),
  request_type: z.enum(SPECIAL_REQUEST_TYPES, {
    errorMap: () => ({ message: 'Please choose a request type' }),
  }),
  message: z
    .string()
    .trim()
    .min(1, 'Please tell us what you need')
    .max(2000, 'Message must be 2000 characters or fewer'),
  preferred_dates: z
    .string()
    .trim()
    .max(200, 'Preferred dates must be 200 characters or fewer')
    .optional()
    .or(z.literal('')),
});

export type SpecialRequestFormValues = z.infer<typeof specialRequestSchema>;

export const specialRequestFormDefaults: SpecialRequestFormValues = {
  name: '',
  email: '',
  phone: '',
  request_type: 'general',
  message: '',
  preferred_dates: '',
};
