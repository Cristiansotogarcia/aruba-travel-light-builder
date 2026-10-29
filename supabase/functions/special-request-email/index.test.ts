// supabase/functions/special-request-email/index.test.ts
//
// Black-box test: spawns the real function with `deno run` (same entrypoint
// Supabase invokes) against a real HTTP server, and exercises it with fetch.
// No source change to index.ts was needed or made to get this testable.
//
// Run from the repo root (needs --config so Deno picks up supabase/functions/deno.json's
// "deno.ns" lib instead of the root tsconfig.json):
//   deno test --config supabase/functions/deno.json --allow-net --allow-env --allow-run --allow-read \
//     supabase/functions/special-request-email/index.test.ts

import { assertEquals, assertExists } from 'https://deno.land/std@0.177.0/testing/asserts.ts';

const FUNCTION_PATH = new URL('./index.ts', import.meta.url);
const PORT = 8000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const samplePayload = {
  special_request: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    request_type: 'last_minute' as const,
    message: 'Can we pick up equipment tonight?',
    preferred_dates: null,
    created_at: '2026-10-29T12:00:00.000Z',
  },
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
  const deadline = Date.now() + 10_000;
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

Deno.test('rejects a request missing special_request details with 400', async () => {
  const process = await startFunction({});
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ special_request: { name: 'No id or email' } }),
    });
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, 'Missing special_request details');
  } finally {
    await stopFunction(process);
  }
});

Deno.test('without RESEND_API_KEY, logs instead of sending and returns 200 to the default staff address', async () => {
  // Explicitly empty: the function reads RESEND_API_KEY once at module load,
  // so the test subprocess's env is what decides this branch, not the shell
  // the test runner happens to inherit.
  const process = await startFunction({ RESEND_API_KEY: '' });
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(samplePayload),
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.message, 'Email service not configured - email logged to console');
    assertEquals(body.recipient, 'info@travelightaruba.com');
    assertEquals(body.special_request_id, samplePayload.special_request.id);
  } finally {
    await stopFunction(process);
  }
});

Deno.test('without RESEND_API_KEY, honors STAFF_NOTIFICATION_EMAIL as the logged recipient', async () => {
  const process = await startFunction({
    RESEND_API_KEY: '',
    STAFF_NOTIFICATION_EMAIL: 'triage@travelightaruba.com',
  });
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(samplePayload),
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.recipient, 'triage@travelightaruba.com');
  } finally {
    await stopFunction(process);
  }
});

Deno.test('malformed JSON body is caught and returns 500 with an error message', async () => {
  const process = await startFunction({ RESEND_API_KEY: '' });
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    assertEquals(res.status, 500);
    const body = await res.json();
    assertExists(body.error);
  } finally {
    await stopFunction(process);
  }
});
