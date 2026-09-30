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
    await handler({ query: { kind: 'blog', slug: 'beach-life' }, headers: { host: 'test-environment.example.com' } }, res);

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
    await handler({ query: { kind: 'blog', slug: 'draft-story' }, headers: { host: 'test-environment.example.com' } }, res);
    expect(res.code).toBe(404);
    expect(res.body).not.toContain('draft-story');
    expect(res.body).toContain('noindex, nofollow');
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('uses a retryable response when the post service fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const res = response();
    await handler({ query: { kind: 'blog', slug: 'beach-life' }, headers: { host: 'test-environment.example.com' } }, res);
    expect(res.code).toBe(503);
    expect(res.body).not.toContain('noindex, nofollow');
  });

  it('builds og:url and canonical from the request host, not the production domain', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{
      title: 'Beach life', slug: 'beach-life', excerpt: 'An island story',
      seo_title: null, seo_description: null, cover_image_url: 'https://example.com/cover.jpg',
    }] }));
    const res = response();
    await handler(
      { query: { kind: 'blog', slug: 'beach-life' }, headers: { host: 'tlb-test-env.vercel.app' } },
      res,
    );
    expect(res.body).toContain('content="https://tlb-test-env.vercel.app/blog/beach-life"');
    expect(res.body).toContain('href="https://tlb-test-env.vercel.app/blog/beach-life"');
    expect(res.body).not.toContain('travelightaruba.com');
  });

  it('prefers x-forwarded-host over host, for when the function sits behind a proxy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{
      title: 'Beach life', slug: 'beach-life', excerpt: 'An island story',
      seo_title: null, seo_description: null, cover_image_url: 'https://example.com/cover.jpg',
    }] }));
    const res = response();
    await handler(
      {
        query: { kind: 'blog', slug: 'beach-life' },
        headers: { host: 'internal.local', 'x-forwarded-host': 'tlb-test-env.vercel.app', 'x-forwarded-proto': 'https' },
      },
      res,
    );
    expect(res.body).toContain('content="https://tlb-test-env.vercel.app/blog/beach-life"');
  });

  it('falls back to the production domain when the request has no host header at all', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    const res = response();
    await handler({ query: { kind: 'blog', slug: 'draft-story' }, headers: {} }, res);
    expect(res.body).toContain('https://travelightaruba.com/blog');
  });

  it('does not claim a width/height for an author cover image it never measured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{
      title: 'Beach life', slug: 'beach-life', excerpt: 'An island story',
      seo_title: null, seo_description: null, cover_image_url: 'https://example.com/cover.jpg',
    }] }));
    const res = response();
    await handler({ query: { kind: 'blog', slug: 'beach-life' }, headers: { host: 'test-environment.example.com' } }, res);
    expect(res.body).toContain('og:image:secure_url" content="https://example.com/cover.jpg"');
    expect(res.body).toContain('og:image:type" content="image/jpeg"');
    expect(res.body).not.toContain('og:image:width');
    expect(res.body).not.toContain('og:image:height');
  });

  it('does claim the known logo dimensions when a post has no cover image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{
      title: 'Beach life', slug: 'beach-life', excerpt: 'An island story',
      seo_title: null, seo_description: null, cover_image_url: null,
    }] }));
    const res = response();
    await handler({ query: { kind: 'blog', slug: 'beach-life' }, headers: { host: 'test-environment.example.com' } }, res);
    expect(res.body).toContain('og:image:width" content="1366"');
    expect(res.body).toContain('og:image:height" content="649"');
    expect(res.body).toContain('og:image:type" content="image/png"');
  });
});
