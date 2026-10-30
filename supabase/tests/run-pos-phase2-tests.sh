#!/usr/bin/env bash
# supabase/tests/run-pos-phase2-tests.sh
#
# Runs pos_fixture.setup.sql + the real phase 1 migration +
# pos_price_booking_stub.sql + pos_phase2_fixture.setup.sql + the real phase 2
# migration (20261029210000_pos_phase2_counter_ops.sql) + pos_phase2_rpc.test.sql
# against a throwaway, real Postgres container (no mocking) and tears it down
# afterwards, pass or fail. Requires Docker. Same scoped-fixture convention as
# run-pos-tests.sh (see its header for why a literal full-migration-history
# replay was tried and abandoned).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

CONTAINER_NAME="travellight-pos-phase2-rpc-test"
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

cat pos_fixture.setup.sql ../migrations/20261029203000_pos_phase1_counter_sale.sql pos_price_booking_stub.sql \
    pos_phase2_fixture.setup.sql ../migrations/20261029210000_pos_phase2_counter_ops.sql \
  | docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres < pos_phase2_rpc.test.sql
