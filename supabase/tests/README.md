# supabase/tests

Real-Postgres SQL test suites for RPCs and server-side pricing (goal
tlb-pos). Each suite is a throwaway `postgres:16-alpine` container, started
and torn down by its own `run-*.sh` script - no mocking.

## Refusals must use `test_assert_refused`

Every "this call must be refused with error code X" assertion uses the
`test_assert_refused(stmt text, code text)` helper (defined in
`pos_fixture.setup.sql` / `price_booking_fixture.setup.sql`, run before any
test file):

```sql
perform test_assert_refused(
  $sql$select public.price_booking(jsonb_build_object(...), jsonb_build_array(...))$sql$,
  'INVALID_DATES'
);
```

Do not hand-roll a `begin ... exception when others ... end` block for a
refusal check, and never call `test_assert(false, label)` or
`test_assert(sqlerrm ilike ..., label)` from inside the same block that
caught the error. That shape is the MF1 bug (Elby, mutant-proven, fixed in
`pos_rpc.test.sql` `00878ff`, recurred in `price_booking.test.sql` and
`pos_phase3_rpc.test.sql`, third strike): the assertion's own raised
`FAIL: <label>` exception is caught by the same handler, and when the label
carries the expected code in parens the synthetic failure message satisfies
the handler's own `sqlerrm ilike '%CODE%'` check - so a guard that lets the
call through silently reports PASS. `test_assert_refused` sets a `refused`
flag inside the handled block and asserts on the flag only after the block
closes, where no handler can intercept it.

Prove a new refusal guard actually does something before trusting it: delete
or disable the guard and confirm the suite goes red, then restore it.
