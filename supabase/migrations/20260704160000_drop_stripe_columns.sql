-- Stripe is removed from the product entirely (owner decision 2026-07-04):
-- payments are manual. The webhook/checkout edge functions are deleted; these
-- columns were only ever written by them. Verified 0 rows carried Stripe data
-- before dropping.

ALTER TABLE public.payment_records
  DROP COLUMN IF EXISTS stripe_session_id,
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_metadata;

ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS stripe_session_id,
  DROP COLUMN IF EXISTS stripe_payment_intent_id;
