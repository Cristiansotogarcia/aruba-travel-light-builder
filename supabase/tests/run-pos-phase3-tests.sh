#!/usr/bin/env bash
# supabase/tests/run-pos-phase3-tests.sh
#
# Runs pos_fixture.setup.sql + the real phase 1 migration +
# pos_price_booking_stub.sql + pos_phase2_fixture.setup.sql + the real phase 2
# migration + the real phase 3 migration
# (20261029220000_pos_phase3_close_out.sql) + the real followup migration
# (20261030200000_pos_cash_close_race.sql, goal tlb-pos-followups) +
# pos_phase3_rpc.test.sql against a throwaway, real Postgres container (no
# mocking) and tears it down afterwards, pass or fail. Requires Docker. Same
# scoped-fixture convention as run-pos-tests.sh / run-pos-phase2-tests.sh (see
# run-pos-tests.sh's header for why a literal full-migration-history replay
# was tried and abandoned).
#
# No additional phase-3-only fixture file is needed: pos_cash_sessions and
# the three RPCs under test come entirely from the real phase 3 migration,
# and pos_phase3_rpc.test.sql needs nothing from the surrounding schema that
# pos_fixture.setup.sql + pos_phase2_fixture.setup.sql don't already supply
# (profiles, bookings, booking_payments, credit_notes, booking_audit_log).
#
# After pos_phase3_rpc.test.sql's single-connection assertions, this script
# also runs a two-connection concurrency check against the SAME container
# (still carrying the real schema/migrations/trigger) proving the
# 20261030200000 close-vs-payment race fix: a cash payment that is inserted
# (so its trigger has already seen the drawer open) but not yet committed
# must block pos_close_drawer until it commits, and the closed session's
# cash_sales must then include it. A true two-session race needs two
# separate backend connections - a single psql invocation reading one script
# runs everything on one connection/transaction and cannot model this - so
# session A runs in the background via its own `docker exec -i psql`
# connection while session B runs in the foreground on a second connection.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

CONTAINER_NAME="travellight-pos-phase3-rpc-test"
IMAGE="postgres:16-alpine"
RACE_A_OUT="$(mktemp)"
RACE_B_OUT="$(mktemp)"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  rm -f "$RACE_A_OUT" "$RACE_B_OUT"
}
trap cleanup EXIT

cleanup # in case a previous run left it behind

docker run -d --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD=postgres \
  "$IMAGE" >/dev/null

echo "Waiting for Postgres to accept connections..."
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

cat pos_fixture.setup.sql ../migrations/20261029203000_pos_phase1_counter_sale.sql pos_price_booking_stub.sql \
    pos_phase2_fixture.setup.sql ../migrations/20261029210000_pos_phase2_counter_ops.sql \
    ../migrations/20261029220000_pos_phase3_close_out.sql \
    ../migrations/20261030200000_pos_cash_close_race.sql \
  | docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres < pos_phase3_rpc.test.sql

# ---------------------------------------------------------------------------
# Close-vs-payment race (20261030200000_pos_cash_close_race.sql): two real
# backend connections against the same container/schema. Staff One
# ('44444444-4444-4444-4444-444444444441', already seeded by
# pos_phase3_rpc.test.sql) opens a fresh drawer (float 0) and a dedicated
# booking is inserted directly (bypassing the RPC - this fixture only needs
# a bookings row to hang a payment off of). Session A opens its own
# transaction, inserts a pos cash payment against that booking (so the
# trigger has already seen the drawer open and taken its FOR SHARE lock),
# then pg_sleep(4) BEFORE committing - simulating a slow client between the
# insert and the commit. ~1s later, session B calls pos_close_drawer, whose
# FOR UPDATE on the session row must block on A's FOR SHARE until A commits.
# Asserts: B's wall-clock elapsed time proves it actually blocked (an
# unblocked call returns in well under a second); B's returned cash_sales
# includes A's payment (not just "some commit happened"); and a cash payment
# attempted after B's close is refused NO_OPEN_DRAWER.
echo "Running the close-vs-payment race concurrency check..."

RACE_STAFF_ID="44444444-4444-4444-4444-444444444441"
RACE_BOOKING_ID="99999999-0000-0000-0000-000000000001"
RACE_AMOUNT=77

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres <<SQL
set role authenticated;
select set_config('request.jwt.claim.sub', '$RACE_STAFF_ID', false);
select public.pos_open_drawer(0, null);
reset role;
insert into public.bookings (id, customer_name, customer_email, customer_phone, customer_address, start_date, end_date, total_amount, status, fulfillment_method)
values ('$RACE_BOOKING_ID', 'Race Test Booking', 'race-test@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', $RACE_AMOUNT, 'confirmed', 'pickup');
SQL

RACE_SESSION_ID=$(docker exec -i "$CONTAINER_NAME" psql -t -A -U postgres -c \
  "select id from public.pos_cash_sessions where status = 'open';")
if [ -z "$RACE_SESSION_ID" ]; then
  echo "FAIL: race fixture did not leave an open drawer session" >&2
  exit 1
fi

# Session A: its own connection/transaction. Holds the trigger's FOR SHARE
# lock on the open session row from the moment the INSERT runs until COMMIT.
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres <<SQL > "$RACE_A_OUT" 2>&1 &
BEGIN;
INSERT INTO public.booking_payments (booking_id, amount, method, channel, recorded_by)
VALUES ('$RACE_BOOKING_ID', $RACE_AMOUNT, 'cash', 'pos', '$RACE_STAFF_ID');
SELECT pg_sleep(4);
COMMIT;
SQL
RACE_A_PID=$!

sleep 1

# Session B: a second connection, started while A is still mid-transaction.
RACE_B_START=$(date +%s)
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -t -A -U postgres <<SQL > "$RACE_B_OUT" 2>&1
set role authenticated;
select set_config('request.jwt.claim.sub', '$RACE_STAFF_ID', false);
select public.pos_close_drawer('$RACE_SESSION_ID', $RACE_AMOUNT, null);
SQL
RACE_B_END=$(date +%s)
RACE_B_ELAPSED=$((RACE_B_END - RACE_B_START))

wait "$RACE_A_PID"
RACE_A_EXIT=$?
if [ "$RACE_A_EXIT" -ne 0 ]; then
  echo "FAIL: race session A did not commit cleanly" >&2
  cat "$RACE_A_OUT" >&2
  exit 1
fi

echo "race: session B elapsed ${RACE_B_ELAPSED}s waiting on session A's commit"
if [ "$RACE_B_ELAPSED" -lt 2 ]; then
  echo "FAIL: pos_close_drawer returned in ${RACE_B_ELAPSED}s - it should have blocked on session A's in-flight payment (expected >= 2s)" >&2
  cat "$RACE_B_OUT" >&2
  exit 1
fi
echo "PASS: pos_close_drawer blocked on the in-flight payment (${RACE_B_ELAPSED}s >= 2s)"

if ! grep -q '"cash_sales": 77' "$RACE_B_OUT"; then
  echo "FAIL: pos_close_drawer's result did not include session A's payment in cash_sales" >&2
  cat "$RACE_B_OUT" >&2
  exit 1
fi
echo "PASS: pos_close_drawer's cash_sales includes session A's payment that committed while it was waiting"

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres <<SQL
do \$\$
begin
  perform test_assert_refused(
    \$race_sql\$insert into public.booking_payments (booking_id, amount, method, channel, recorded_by) values ('$RACE_BOOKING_ID', 10, 'cash', 'pos', '$RACE_STAFF_ID')\$race_sql\$,
    'NO_OPEN_DRAWER');
end \$\$;
SQL

# ---------------------------------------------------------------------------
# Second ordering: the close's TRANSACTION starts before the payment, but the
# close reaches its FOR UPDATE only after the payment has taken FOR SHARE.
# The payment's created_at (now() of its own transaction) is then LATER than
# the close transaction's now(), so a close that cut the window at now()
# would leave this payment out of cash_sales and refuse the zero-variance
# count with VARIANCE_NOTE_REQUIRED. The cutoff is clock_timestamp() read
# after the lock, which includes it. Timeline: B begins at 0s and sleeps 2s
# before closing; A begins at 1s, inserts, sleeps 3s, commits at ~4s.
echo "Running the close-starts-first race check..."

RACE2_BOOKING_ID="99999999-0000-0000-0000-000000000002"
RACE2_AMOUNT=55

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres <<SQL
set role authenticated;
select set_config('request.jwt.claim.sub', '$RACE_STAFF_ID', false);
select public.pos_open_drawer(0, null);
reset role;
insert into public.bookings (id, customer_name, customer_email, customer_phone, customer_address, start_date, end_date, total_amount, status, fulfillment_method)
values ('$RACE2_BOOKING_ID', 'Race Test Booking 2', 'race-test-2@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', $RACE2_AMOUNT, 'confirmed', 'pickup');
SQL

RACE2_SESSION_ID=$(docker exec -i "$CONTAINER_NAME" psql -t -A -U postgres -c \
  "select id from public.pos_cash_sessions where status = 'open';")
if [ -z "$RACE2_SESSION_ID" ]; then
  echo "FAIL: second race fixture did not leave an open drawer session" >&2
  exit 1
fi

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -t -A -U postgres <<SQL > "$RACE_B_OUT" 2>&1 &
BEGIN;
set local role authenticated;
select set_config('request.jwt.claim.sub', '$RACE_STAFF_ID', true);
select pg_sleep(2);
select public.pos_close_drawer('$RACE2_SESSION_ID', $RACE2_AMOUNT, null);
COMMIT;
SQL
RACE2_B_PID=$!

sleep 1

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres <<SQL > "$RACE_A_OUT" 2>&1
BEGIN;
INSERT INTO public.booking_payments (booking_id, amount, method, channel, recorded_by)
VALUES ('$RACE2_BOOKING_ID', $RACE2_AMOUNT, 'cash', 'pos', '$RACE_STAFF_ID');
SELECT pg_sleep(3);
COMMIT;
SQL

if ! wait "$RACE2_B_PID"; then
  echo "FAIL: pos_close_drawer failed when its transaction started before the payment" >&2
  cat "$RACE_B_OUT" >&2
  exit 1
fi

if ! grep -q "\"cash_sales\": $RACE2_AMOUNT" "$RACE_B_OUT"; then
  echo "FAIL: pos_close_drawer's cash_sales left out a payment created after its transaction began" >&2
  cat "$RACE_B_OUT" >&2
  exit 1
fi
echo "PASS: pos_close_drawer includes a payment created after its transaction began but committed before the close"
