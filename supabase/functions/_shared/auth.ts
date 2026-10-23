// supabase/functions/_shared/auth.ts
//
// Shared authorization gate for edge functions that must only be callable by
// authenticated staff. Mirrors the vetted pattern in create-user-with-otp /
// admin-user-operations: validate the caller's JWT, then check profiles.role
// against a whitelist using a service-role client (so the lookup is not itself
// filtered by RLS).
//
// Why this exists: Supabase's platform `verify_jwt` only requires *any*
// project-signed JWT, and the public anon key (shipped in the frontend bundle)
// is such a JWT. Without this gate, any holder of the anon key can invoke these
// functions. `requireRole` closes that by requiring a real user session whose
// profile role is permitted.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export interface StaffCaller {
  id: string;
  role: string;
  email: string | null;
}

export type AuthResult =
  | { ok: true; caller: StaffCaller }
  | { ok: false; response: Response };

// Named role groups so each function reads declaratively. Roles match the
// assignable set in create-user-with-otp (Customer is intentionally excluded
// from every staff group).
export const OFFICE_ROLES = ['Admin', 'SuperUser', 'Booker'] as const;
export const BILLING_ROLES = ['Admin', 'SuperUser', 'Booker', 'Accounting'] as const;
export const STAFF_ROLES = ['Admin', 'SuperUser', 'Booker', 'Accounting', 'StoreStaff', 'Driver'] as const;

/**
 * Verify the request comes from an authenticated user whose profiles.role is in
 * `allowedRoles`. On failure returns a ready-to-return 401/403 Response that
 * only says Unauthorized/Forbidden (no detail leak). On success returns the
 * caller's id, role, and email.
 */
export async function requireRole(
  req: Request,
  allowedRoles: readonly string[],
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { ok: false, response: jsonResponse({ error: 'Missing authorization header' }, 401) };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // Caller-scoped client: validates the JWT actually presented in the request.
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized' }, 401) };
  }

  // Service-role client for the role lookup only — used after the caller's
  // identity is established, never with caller-supplied input.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile || !allowedRoles.includes(profile.role)) {
    return { ok: false, response: jsonResponse({ error: 'Forbidden' }, 403) };
  }

  return {
    ok: true,
    caller: { id: userData.user.id, role: profile.role, email: userData.user.email ?? null },
  };
}
