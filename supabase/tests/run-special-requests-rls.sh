#!/usr/bin/env bash
# supabase/tests/run-special-requests-rls.sh
#
# Runs special_requests_rls.setup.sql + special_requests_rls.test.sql against
# a throwaway, real Postgres container (no mocking) and tears it down
# afterwards, pass or fail. Requires Docker.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

CONTAINER_NAME="travellight-special-requests-rls-test"
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

cat special_requests_rls.setup.sql ../migrations/20261029200000_special_requests.sql \
  | docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres < special_requests_rls.test.sql
