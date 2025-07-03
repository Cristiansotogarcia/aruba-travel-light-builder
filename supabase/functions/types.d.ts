// Type declarations for Deno modules used in Supabase Edge Functions

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export interface SupabaseClient {
    auth: {
      getUser(jwt: string): Promise<{
        data: { user: any | null };
        error: any | null;
      }>;
    };
  }
  
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): SupabaseClient;
}

declare module "../_shared/cors.ts" {
  export const corsHeaders: Record<string, string>;
}
