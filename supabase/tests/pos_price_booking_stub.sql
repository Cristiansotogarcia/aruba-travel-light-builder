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
-- over items, nights = GREATEST(1, end_date - start_date), +1 when
-- delivery_slot = 'morning' and pickup_slot = 'afternoon' (the same +1 rule
-- computeBookingTotals/the real price_booking apply). The slot term was
-- added for #109's extend regression test (Claudy found extend_booking_rental
-- was not passing the booking's slots into price_booking at all; 62ad54c
-- fixed it) - without it this stub could not tell a slot-dropping regression
-- apart from a correct call. It must be replaced with the real price_booking
-- once it lands; nothing here is meant to describe the real pricing
-- contract's day tiers or fees.
--
-- One contract check on the INPUT: the real price_booking defaults a missing
-- fulfillment_method to delivery (and charges the delivery fee), while
-- pos_create_sale defaults it to pickup. pos_create_sale must therefore always
-- pass the resolved value. The stub refuses a call without the key, so a
-- regression there fails the "fulfillment omitted" case in pos_rpc.test.sql
-- instead of silently pricing a pickup sale as a delivery.
CREATE OR REPLACE FUNCTION public.price_booking(p_booking jsonb, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NOT (p_booking ? 'fulfillment_method') THEN
    RAISE EXCEPTION 'STUB_FULFILLMENT_MISSING: caller must pass fulfillment_method';
  END IF;
  RETURN jsonb_build_object(
    'total',
    (
      SELECT COALESCE(SUM(e.price_per_day * (i->>'quantity')::int), 0)
             * (
                 GREATEST(1, (p_booking->>'end_date')::date - (p_booking->>'start_date')::date)
                 + CASE WHEN p_booking->>'delivery_slot' = 'morning' AND p_booking->>'pickup_slot' = 'afternoon'
                        THEN 1 ELSE 0 END
               )
      FROM jsonb_array_elements(p_items) i
      JOIN public.equipment e ON e.id = (i->>'equipment_id')::uuid
    )
  );
END;
$$;
