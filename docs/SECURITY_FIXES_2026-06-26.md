# Security Fixes — 2026-06-26

Remediation of the security scan run on 2026-06-26. Covers the critical/high
findings. Workstream A (RLS + auth holes) is implemented here; 2FA (TOTP) is a
follow-up.

## What was changed (in this branch)

### 1. RLS enabled on `bookings`, `booking_items`, `profiles` (CRITICAL)
`supabase/migrations/20260626000000_security_enable_rls_and_role_guard.sql`
- These tables had **no** `ENABLE ROW LEVEL SECURITY`, so every policy on them
  was inert and any anon-key holder could read all customer PII and self-promote
  to admin.
- Migration enables RLS (not FORCE — service-role + SECURITY DEFINER paths keep
  working) and adds a `BEFORE UPDATE` trigger that blocks non-admins from
  changing their own `role` / `is_deactivated`.
- Adds a profiles INSERT policy pinning self-inserts to the `Customer` role.

### 2. Delivery-proofs storage policies tightened (HIGH)
`supabase/migrations/20260626000001_tighten_delivery_proofs_policies.sql`
- Drops the legacy broad `"Allow authenticated …"` policies that let any
  logged-in user read/upload/overwrite every signature image.
- Adds a scoped UPDATE policy so staff overwrite/upsert still works.

### 3. `create-user-with-otp` edge function — auth gate added (CRITICAL)
- Now requires the caller's JWT and an `Admin`/`SuperUser` profile before using
  the service-role key, mirroring `admin-user-operations`. Also whitelists the
  assignable `role`.

### 4. `stripe-webhook` — real signature verification (CRITICAL)
- Replaced the no-op "simplified" check with a dependency-free HMAC-SHA256
  verification (Web Crypto) of the `stripe-signature` header against
  `STRIPE_WEBHOOK_SECRET`, including a 5-minute timestamp tolerance. Forged
  webhooks can no longer mark bookings paid.

### 5. `verify-password` — no longer an open oracle (HIGH)
- Now requires the caller's JWT, verifies only the **caller's own** password
  (ignores any client-supplied email), and returns `{ success }` only — no
  profile/PII.

## Deploying these changes

```bash
# 1. Apply the new migrations to the Supabase project
supabase db push

# 2. Redeploy the patched edge functions
supabase functions deploy create-user-with-otp
supabase functions deploy stripe-webhook
supabase functions deploy verify-password
```

> Apply to a **staging** project first if you have one, run the smoke tests
> below, then promote to production.

## REQUIRED manual actions (cannot be done from code)

### A. Verify live RLS state BEFORE/AFTER
Run in the Supabase SQL editor:
```sql
select relname, relrowsecurity
from pg_class
where relname in ('bookings','booking_items','profiles');
```
After `db push`, all three must show `relrowsecurity = true`.

### B. Rotate leaked secrets (they exist in git history / the bundle)
Rotate ALL of these, since `.env` was committed historically:
- Supabase **service-role** key and **anon** key (Supabase dashboard → API → roll keys)
- **Cloudflare** API token
- **Umami** API key

Then update them in Supabase Edge **secrets** (not `.env`/Vercel) and in the
deploy env. `VITE_UMAMI_API_KEY` is referenced in client code and therefore
ships to browsers — ideally proxy it through an edge function; at minimum treat
it as public and scope it to read-only.

### C. Remove `.env` footguns
In `.env`, delete these unused lines (they are NOT referenced in `src/`, but the
names are dangerous — a future `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY`
would ship full DB admin to every visitor):
- `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `VITE_CLOUDFLARE_API_TOKEN`

(Claude did not edit `.env` per the repo safety rules — do this by hand.)

### D. Purge `.env` from git history
After rotation, scrub history (e.g. `git filter-repo --path .env --invert-paths`
or BFG) and force-push with team coordination.

## Smoke tests after deploy
1. **Customer**: log in, view your own bookings ✔, cannot see others.
2. **Customer console attack**: `supabase.from('profiles').update({role:'Admin'}).eq('id', myId)` → must ERROR/0 rows.
3. **Admin**: user management still lists/creates/edits users; role changes work.
4. **Driver**: dashboard loads assigned tasks; can upload a delivery proof.
5. **Booking**: a guest booking still completes end-to-end (uses the SECURITY DEFINER RPC).
6. **Stripe**: a real test-mode checkout still flips the booking to paid; a hand-forged POST to the webhook returns 400.
7. **Password gate**: change-password / delete flows still validate the current password.

## Deferred (recommended follow-ups, not yet changed)
- Tighten Driver booking SELECT to assigned-only, and Booker UPDATE scoping
  (MEDIUM — deferred to avoid breaking the dashboards without UI testing).
- Add auth gates to `create-payment-session`, `cloudflare-*`, and `send-*-email`
  functions (MEDIUM — phishing / enumeration surface).
- Implement TOTP 2FA for staff dashboards (separate workstream).
