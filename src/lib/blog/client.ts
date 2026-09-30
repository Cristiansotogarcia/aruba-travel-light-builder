import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// The generated Database type (src/types/supabase.ts) predates the blog
// tables, so blog queries go through an untyped view of the same client and
// are typed at the call site with the interfaces in ./types.
export const blogDb = supabase as unknown as SupabaseClient;

export const BLOG_IMAGES_BUCKET = 'blog-images';
