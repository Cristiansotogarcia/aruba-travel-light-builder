import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// The generated Database type (src/types/supabase.ts) predates the
// special_requests table added by supabase/migrations/20261029200000_special_requests.sql,
// so special-request queries go through an untyped view of the same client
// and are typed at the call site with specialRequestSchema / SpecialRequestRecord.
// Mirrors the established pattern in src/lib/blog/client.ts.
export const specialRequestsDb = supabase as unknown as SupabaseClient;
