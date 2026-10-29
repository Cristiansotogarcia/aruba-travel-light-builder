-- supabase/tests/pos_price_booking_stub.sql
--
-- public.price_booking(p_booking jsonb, p_items jsonb) does not exist on any
-- branch yet (Claudy, PR #108: "price_booking does not exist on this branch
-- yet; its output keys are not final... Plutus, 2026-10-29"). pos_create_sale
-- reads exactly one key from its result, {"total"}, and nothing else in this
-- RPC depends on price_booking's real pricing rules (fees, weekly rates,
-- delivery surcharges) - those are out of scope for pos_create_sale's own
-- contract, which only forbids the CLIENT from supplying a price and trusts
-- whatever public.price_booking returns.
--
-- This TEST-ONLY stub is deliberately simple and deterministic so the RPC
-- tests can assert an exact total: price_per_day * quantity * nights, summed
-- over items, nights = GREATEST(1, end_date - start_date). It must be
-- replaced with the real price_booking once it lands; nothing here is meant
-- to describe the real pricing contract.
CREATE OR REPLACE FUNCTION public.price_booking(p_booking jsonb, p_items jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'total',
    (
      SELECT COALESCE(SUM(e.price_per_day * (i->>'quantity')::int), 0)
             * GREATEST(1, (p_booking->>'end_date')::date - (p_booking->>'start_date')::date)
      FROM jsonb_array_elements(p_items) i
      JOIN public.equipment e ON e.id = (i->>'equipment_id')::uuid
    )
  );
$$;
