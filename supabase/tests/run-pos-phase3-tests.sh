#!/usr/bin/env bash
# supabase/tests/run-pos-phase3-tests.sh
#
# Runs pos_fixture.setup.sql + the real phase 1 migration +
# pos_price_booking_stub.sql + pos_phase2_fixture.setup.sql + the real phase 2
# migration + the real phase 3 migration
# (20261029220000_pos_phase3_close_out.sql) + pos_phase3_rpc.test.sql against
# a throwaway, real Postgres container (no mocking) and tears it down
# afterwards, pass or fail. Requires Docker. Same scoped-fixture convention as
# run-pos-tests.sh / run-pos-phase2-tests.sh (see run-pos-tests.sh's header
# for why a literal full-migration-history replay was tried and abandoned).
#
# No additional phase-3-only fixture file is needed: pos_cash_sessions and
# the three RPCs under test come entirely from the real phase 3 migration,
# and pos_phase3_rpc.test.sql needs nothing from the surrounding schema that
# pos_fixture.setup.sql + pos_phase2_fixture.setup.sql don't already supply
# (profiles, bookings, booking_payments, credit_notes, booking_audit_log).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

CONTAINER_NAME="travellight-pos-phase3-rpc-test"
IMAGE="postgres:16-alpine"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
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

cat pos_fixture.setup.sql ../migrations/20261029190000_pos_phase1_counter_sale.sql pos_price_booking_stub.sql \
    pos_phase2_fixture.setup.sql ../migrations/20261029210000_pos_phase2_counter_ops.sql \
    ../migrations/20261029220000_pos_phase3_close_out.sql \
  | docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres < pos_phase3_rpc.test.sql
