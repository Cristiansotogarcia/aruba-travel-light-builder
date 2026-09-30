import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';

let handler;
const originalKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

beforeAll(async () => {
  process.env.VITE_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key';
  handler = (await import('./share-preview.js')).default;
});
afterAll(() => {
  if (originalKey === undefined) delete process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.VITE_PUBLIC_SUPABASE_ANON_KEY = originalKey;
});
afterEach(() => vi.unstubAllGlobals());

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

describe('blog crawler preview', () => {
  it('shows only published due stories and escapes metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{
      title: 'Beach <life>', slug: 'beach-life', excerpt: 'An & island story',
      seo_title: null, seo_description: null, cover_image_url: 'https://example.com/cover.jpg',
    }] });
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler({ query: { kind: 'blog', slug: 'beach-life' } }, res);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('status')).toBe('eq.published');
    expect(url.searchParams.get('published_at')).toMatch(/^lte\.\d{4}-/);
    expect(url.searchParams.get('slug')).toBe('eq.beach-life');
    expect(res.code).toBe(200);
    expect(res.body).toContain('Beach &lt;life&gt;');
    expect(res.body).toContain('An &amp; island story');
    expect(res.body).toContain('content="article"');
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('returns no private metadata for a missing or unpublished slug', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    const res = response();
    await handler({ query: { kind: 'blog', slug: 'draft-story' } }, res);
    expect(res.code).toBe(404);
    expect(res.body).not.toContain('draft-story');
    expect(res.body).toContain('noindex, nofollow');
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('uses a retryable response when the post service fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const res = response();
    await handler({ query: { kind: 'blog', slug: 'beach-life' } }, res);
    expect(res.code).toBe(503);
    expect(res.body).not.toContain('noindex, nofollow');
  });
});
