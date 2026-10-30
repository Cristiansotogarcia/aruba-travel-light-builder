// supabase/functions/special-request-email/index.test.ts
//
// Black-box test: spawns the real function with `deno run` (same entrypoint
// Supabase invokes) against a real HTTP server, and exercises it with fetch.
// The function talks to a fake PostgREST (a local Deno.serve on PG_PORT) so
// the claim-by-id path runs through the real supabase-js client.
//
// Run from the repo root (needs --config so Deno picks up supabase/functions/deno.json's
// "deno.ns" lib instead of the root tsconfig.json):
//   deno test --config supabase/functions/deno.json --allow-net --allow-env --allow-run --allow-read \
//     supabase/functions/special-request-email/index.test.ts

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';

const FUNCTION_PATH = new URL('./index.ts', import.meta.url);
const PORT = 8000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PG_PORT = 8001;
const SERVICE_KEY = 'test-service-role-key';

const REQUEST_ID = '11111111-1111-1111-1111-111111111111';

const storedRow = {
  id: REQUEST_ID,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: null,
  request_type: 'last_minute',
  message: 'Can we pick up equipment tonight?',
  preferred_dates: null,
  created_at: '2026-10-29T12:00:00.000Z',
};

interface SeenRequest {
  method: string;
  path: string;
  params: URLSearchParams;
  apikey: string | null;
  body: Record<string, unknown> | null;
}

// Fake PostgREST: answers PATCH /rest/v1/special_requests with `rows` and
// records every request so a test can assert what the function asked for.
function startFakePostgrest(rows: unknown[]) {
  const seen: SeenRequest[] = [];
  const server = Deno.serve({ port: PG_PORT, hostname: '127.0.0.1', onListen() {} }, async (req) => {
    const url = new URL(req.url);
    const text = await req.text();
    seen.push({
      method: req.method,
      path: url.pathname,
      params: url.searchParams,
      apikey: req.headers.get('apikey'),
      body: text ? JSON.parse(text) : null,
    });
    // The claim asks for the row back (select=...); the release does not.
    const body = url.searchParams.has('select') ? JSON.stringify(rows) : null;
    return new Response(body, {
      status: body ? 200 : 204,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { seen, stop: () => server.shutdown() };
}

const dbEnv = {
  SUPABASE_URL: `http://127.0.0.1:${PG_PORT}`,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
};

async function startFunction(env: Record<string, string>): Promise<Deno.ChildProcess> {
  const command = new Deno.Command(Deno.execPath(), {
    args: ['run', '--allow-net', '--allow-env', FUNCTION_PATH.pathname],
    env,
    stdout: 'null',
    stderr: 'null',
  });
  const process = command.spawn();

  // Poll until the server accepts connections instead of a fixed sleep.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL, { method: 'OPTIONS' });
      await res.body?.cancel();
      return process;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  process.kill();
  throw new Error('special-request-email function did not start listening in time');
}

async function stopFunction(process: Deno.ChildProcess) {
  try {
    process.kill();
  } catch {
    // already exited
  }
  await process.status;
}

function post(body: string) {
  return fetch(BASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}

Deno.test('OPTIONS preflight returns CORS headers without touching the handler body', async () => {
  const process = await startFunction({});
  try {
    const res = await fetch(BASE_URL, { method: 'OPTIONS' });
    assertEquals(res.status, 200);
    assertEquals(res.headers.get('access-control-allow-origin'), '*');
    await res.body?.cancel();
  } finally {
    await stopFunction(process);
  }
});

Deno.test('a caller-supplied special_request body is refused with 400 and never reaches the database', async () => {
  // The old open-relay shape: the full row in the body, no top-level id.
  const pg = startFakePostgrest([storedRow]);
  const process = await startFunction({ ...dbEnv, RESEND_API_KEY: '' });
  try {
    const res = await post(JSON.stringify({ special_request: { ...storedRow, email: 'attacker@example.com' } }));
    assertEquals(res.status, 400);
    assertEquals((await res.json()).error, 'Could not send special request email');
    assertEquals(pg.seen.length, 0);
  } finally {
    await stopFunction(process);
    await pg.stop();
  }
});

Deno.test('a non-uuid id is refused with 400 and never reaches the database', async () => {
  const pg = startFakePostgrest([storedRow]);
  const process = await startFunction({ ...dbEnv, RESEND_API_KEY: '' });
  try {
    for (const id of ['not-a-uuid', 42, '', `${REQUEST_ID},00000000-0000-0000-0000-000000000000`]) {
      const res = await post(JSON.stringify({ id }));
      assertEquals(res.status, 400, `id ${JSON.stringify(id)}`);
      await res.body?.cancel();
    }
    assertEquals(pg.seen.length, 0);
  } finally {
    await stopFunction(process);
    await pg.stop();
  }
});

Deno.test('malformed JSON body returns 400 with the generic error', async () => {
  const process = await startFunction({ ...dbEnv, RESEND_API_KEY: '' });
  try {
    const res = await post('{not json');
    assertEquals(res.status, 400);
    assertEquals((await res.json()).error, 'Could not send special request email');
  } finally {
    await stopFunction(process);
  }
});

Deno.test('without the service role configured, returns 500 instead of sending', async () => {
  const process = await startFunction({ RESEND_API_KEY: '' });
  try {
    const res = await post(JSON.stringify({ id: REQUEST_ID }));
    assertEquals(res.status, 500);
    await res.body?.cancel();
  } finally {
    await stopFunction(process);
  }
});

Deno.test('claims the row with a conditional update: only this id, only while notified_at is null, with the service key', async () => {
  const pg = startFakePostgrest([storedRow]);
  const process = await startFunction({ ...dbEnv, RESEND_API_KEY: '' });
  try {
    const res = await post(JSON.stringify({ id: REQUEST_ID }));
    assertEquals(res.status, 200);
    await res.body?.cancel();

    const claim = pg.seen[0];
    assertEquals(claim.method, 'PATCH');
    assertEquals(claim.path, '/rest/v1/special_requests');
    assertEquals(claim.params.get('id'), `eq.${REQUEST_ID}`);
    assertEquals(claim.params.get('notified_at'), 'is.null');
    assertEquals(claim.apikey, SERVICE_KEY);
    assert(typeof claim.body?.notified_at === 'string', 'claim sets notified_at to a timestamp');
  } finally {
    await stopFunction(process);
    await pg.stop();
  }
});

Deno.test('an id that matches no unclaimed row (unknown or already notified) returns 404 and sends nothing', async () => {
  const pg = startFakePostgrest([]);
  const process = await startFunction({ ...dbEnv, RESEND_API_KEY: '' });
  try {
    const res = await post(JSON.stringify({ id: REQUEST_ID }));
    assertEquals(res.status, 404);
    await res.body?.cancel();
    // Only the claim attempt, no release.
    assertEquals(pg.seen.length, 1);
  } finally {
    await stopFunction(process);
    await pg.stop();
  }
});

Deno.test('without RESEND_API_KEY, logs to the default staff address and releases the claim', async () => {
  // Explicitly empty: the function reads RESEND_API_KEY once at module load,
  // so the test subprocess's env is what decides this branch, not the shell
  // the test runner happens to inherit.
  const pg = startFakePostgrest([storedRow]);
  const process = await startFunction({ ...dbEnv, RESEND_API_KEY: '' });
  try {
    const res = await post(JSON.stringify({ id: REQUEST_ID }));
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.message, 'Email service not configured - email logged to console');
    assertEquals(body.recipient, 'info@travelightaruba.com');
    assertEquals(body.special_request_id, REQUEST_ID);

    assertEquals(pg.seen.length, 2);
    const release = pg.seen[1];
    assertEquals(release.method, 'PATCH');
    assertEquals(release.params.get('id'), `eq.${REQUEST_ID}`);
    assertEquals(release.body, { notified_at: null });
  } finally {
    await stopFunction(process);
    await pg.stop();
  }
});

Deno.test('without RESEND_API_KEY, honors STAFF_NOTIFICATION_EMAIL as the logged recipient', async () => {
  const pg = startFakePostgrest([storedRow]);
  const process = await startFunction({
    ...dbEnv,
    RESEND_API_KEY: '',
    STAFF_NOTIFICATION_EMAIL: 'triage@travelightaruba.com',
  });
  try {
    const res = await post(JSON.stringify({ id: REQUEST_ID }));
    assertEquals(res.status, 200);
    assertEquals((await res.json()).recipient, 'triage@travelightaruba.com');
  } finally {
    await stopFunction(process);
    await pg.stop();
  }
});

// Fake Resend: answers every POST with `status` and `body`, and records what
// the function sent.
const RESEND_PORT = 8002;
function startFakeResend(status: number, body: string) {
  const seen: Record<string, unknown>[] = [];
  const server = Deno.serve({ port: RESEND_PORT, hostname: '127.0.0.1', onListen() {} }, async (req) => {
    seen.push(JSON.parse(await req.text()));
    return new Response(body, { status });
  });
  return { seen, stop: () => server.shutdown() };
}

const resendEnv = {
  RESEND_API_KEY: 'test-resend-key',
  RESEND_API_URL: `http://127.0.0.1:${RESEND_PORT}/emails`,
};

Deno.test('a real send goes to staff with the reply-to and content taken from the stored row, and keeps the claim', async () => {
  const pg = startFakePostgrest([storedRow]);
  const resend = startFakeResend(200, JSON.stringify({ id: 'email-123' }));
  const process = await startFunction({ ...dbEnv, ...resendEnv });
  try {
    const res = await post(JSON.stringify({ id: REQUEST_ID }));
    assertEquals(res.status, 200);
    assertEquals((await res.json()).emailId, 'email-123');

    assertEquals(resend.seen.length, 1);
    assertEquals(resend.seen[0].to, ['info@travelightaruba.com']);
    assertEquals(resend.seen[0].reply_to, storedRow.email);
    assert(String(resend.seen[0].html).includes(storedRow.message), 'email body renders the stored message');
    // Only the claim, no release.
    assertEquals(pg.seen.length, 1);
  } finally {
    await stopFunction(process);
    await resend.stop();
    await pg.stop();
  }
});

Deno.test('Resend refusing the send returns 502 and releases the claim', async () => {
  const pg = startFakePostgrest([storedRow]);
  const resend = startFakeResend(500, 'upstream down');
  const process = await startFunction({ ...dbEnv, ...resendEnv });
  try {
    const res = await post(JSON.stringify({ id: REQUEST_ID }));
    assertEquals(res.status, 502);
    await res.body?.cancel();
    assertEquals(pg.seen.length, 2);
    assertEquals(pg.seen[1].body, { notified_at: null });
  } finally {
    await stopFunction(process);
    await resend.stop();
    await pg.stop();
  }
});

Deno.test('an accepted send with a non-JSON response still returns 200 and keeps the claim (no second email)', async () => {
  const pg = startFakePostgrest([storedRow]);
  const resend = startFakeResend(200, 'OK');
  const process = await startFunction({ ...dbEnv, ...resendEnv });
  try {
    const res = await post(JSON.stringify({ id: REQUEST_ID }));
    assertEquals(res.status, 200);
    await res.body?.cancel();
    assertEquals(resend.seen.length, 1);
    // Only the claim, no release.
    assertEquals(pg.seen.length, 1);
  } finally {
    await stopFunction(process);
    await resend.stop();
    await pg.stop();
  }
});
