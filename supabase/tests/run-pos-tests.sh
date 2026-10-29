#!/usr/bin/env bash
# supabase/tests/run-pos-tests.sh
#
# Runs pos_fixture.setup.sql + the real pos_create_sale migration
# (20261029190000_pos_phase1_counter_sale.sql) + pos_price_booking_stub.sql +
# pos_rpc.test.sql against a throwaway, real Postgres container (no mocking)
# and tears it down afterwards, pass or fail. Requires Docker.
#
# A literal replay of all real migrations in filename order (through
# 20261029190000) was tried first and abandoned: this repo's migration
# filenames are not reliably chronological (e.g.
# 20250122000001_enhance_booking_system.sql ALTERs public.equipment, which
# 20250704000000_create_equipment_table.sql only creates later - a real,
# pre-existing ordering inconsistency unrelated to pos_create_sale), so
# pos_fixture.setup.sql supplies a scoped structural fixture instead, the
# same convention as scripts/tests/split-fulfillment/bootstrap.sql. See that
# file's header for exactly what is reused verbatim vs. hand-assembled.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

CONTAINER_NAME="travellight-pos-rpc-test"
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
  | docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres < pos_rpc.test.sql
