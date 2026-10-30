#!/usr/bin/env bash
# supabase/tests/run-price-booking-tests.sh
#
# Runs price_booking_fixture.setup.sql + the real price_booking migration
# (20261030130000_price_booking.sql) + price_booking.test.sql against a
# throwaway, real Postgres container (no mocking) and tears it down
# afterwards, pass or fail. Requires Docker. Same pattern as
# run-pos-tests.sh / run-special-requests-rls.sh.
#
# price_booking_parity_cases.json (the shared case table also read by
# src/lib/pricing/bookingTotals.parity.test.ts) is spliced into the test
# session as a custom GUC (app.price_booking_parity_cases) before
# price_booking.test.sql runs, so both sides read the exact same file and
# can never drift apart.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

CONTAINER_NAME="travellight-price-booking-test"
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

cat price_booking_fixture.setup.sql ../migrations/20261030130000_price_booking.sql \
  | docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres

{
  printf "select set_config('app.price_booking_parity_cases', \$pbjson\$%s\$pbjson\$, false);\n" "$(cat price_booking_parity_cases.json)"
  cat price_booking.test.sql
} | docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres
