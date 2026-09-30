// Social-share preview for equipment and published blog pages.
//
// Social crawlers (WhatsApp, Facebook, X, ...) don't execute JavaScript, so
// they never see the React-rendered og: tags. vercel.json rewrites
// /equipment/:slug to this function for crawler user-agents only; it returns
// a minimal HTML document whose og:image is the product photo, falling back
// to the TLA logo. Regular visitors never hit this code path.

const SUPABASE_URL =
  process.env.VITE_PUBLIC_SUPABASE_URL || 'https://abofxrgdxfzrhjbvhdkj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Fallback origin only: used when a request somehow carries no host header at
// all. Every real request (including test_environment) builds og:url/canonical
// from the request's own host below, so a shared post always previews on the
// host it was actually shared from instead of always pointing at production.
const SITE_URL = 'https://travelightaruba.com';
const LOGO_IMAGE =
  'https://imagedelivery.net/KE7oljFadxNqgUvpxIG0Zg/b0ed7b8f-a7a0-4a00-810f-8b0f02e46500/public';
// Verified once via the live asset (200 image/png, 70827 bytes) — our own
// static fallback, so unlike an author's upload its pixel size is actually known.
const LOGO_IMAGE_SIZE = { width: 1366, height: 649, type: 'image/png' };

// Mirrors src/utils/slugify.ts
const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Serve a social-share-friendly rendition for Cloudflare-hosted images.
const shareImage = (url) => {
  const m = String(url).match(/^(https:\/\/imagedelivery\.net\/[^/]+\/[^/]+)\/[^/]+$/);
  return m ? `${m[1]}/w=1200` : url;
};

// Supabase Storage image transformation (`/storage/v1/render/image/...`) would
// let us shrink a large cover on the fly, but a read-only probe against this
// project's own bucket returned 403 FeatureNotEnabled (checked 2026-09-30):
//   curl '.../storage/v1/render/image/public/blog-images/.../covers/....jpg
//         ?width=1200&height=630&resize=cover&quality=75'
//   -> 403 {"error":"FeatureNotEnabled","message":"feature not enabled for this tenant"}
// So existing large covers are served as-is (WhatsApp drops an og:image over
// ~300KB — see cropImageToBlob in src/lib/blog/imageCrop.ts, which keeps every
// *new* cover under that from now on). Re-probe if the project's plan changes.

const EXTENSION_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};

/** Best-effort MIME type from the image URL's extension; falls back to JPEG,
 * the format every cover/body image upload now exports as (see imageCrop.ts). */
const imageMimeType = (url) => {
  const match = String(url).match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  const ext = match ? match[1].toLowerCase() : '';
  return EXTENSION_MIME[ext] || 'image/jpeg';
};

/** Builds the page's own origin from the request instead of a hardcoded
 * production domain, so og:url/canonical match whatever host (production,
 * test_environment, a preview deploy) the page was actually shared from. */
const resolveOrigin = (req) => {
  const headers = req?.headers || {};
  const forwardedHost = headers['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || headers.host;
  if (!host) return SITE_URL;
  const forwardedProto = headers['x-forwarded-proto'];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || 'https';
  return `${proto}://${host}`;
};

export default async function handler(req, res) {
  const slug = String(req.query.slug || '');
  const isBlog = req.query.kind === 'blog';
  const origin = resolveOrigin(req);

  let title = 'TLA - Premium Beach & Baby Equipment Rentals in Aruba';
  let description = 'Premium Beach & Baby Equipment Rentals in Aruba';
  let image = LOGO_IMAGE;
  let imageSize = LOGO_IMAGE_SIZE;
  let pageUrl = `${origin}/${isBlog ? 'blog' : 'equipment'}`;
  let found = !isBlog;
  let unavailable = isBlog && !SUPABASE_ANON_KEY;

  try {
    if (isBlog && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && SUPABASE_ANON_KEY) {
      const query = new URLSearchParams({
        select: 'title,slug,excerpt,cover_image_url,seo_title,seo_description,published_at',
        slug: `eq.${slug}`,
        status: 'eq.published',
        published_at: `lte.${new Date().toISOString()}`,
        limit: '1',
      });
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?${query}`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (resp.ok) {
        const rows = await resp.json();
        const post = rows[0];
        if (post) {
          found = true;
          title = post.seo_title || post.title;
          description = post.seo_description || post.excerpt || post.title;
          if (post.cover_image_url) {
            image = shareImage(post.cover_image_url);
            // An author's own cover, not our static logo — its real pixel size
            // isn't known here (see the transform-endpoint probe note above).
            imageSize = null;
          } else {
            image = LOGO_IMAGE;
            imageSize = LOGO_IMAGE_SIZE;
          }
          pageUrl = `${origin}/blog/${slug}`;
        }
      } else unavailable = true;
    } else if (!isBlog && slug && SUPABASE_ANON_KEY) {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/equipment?select=name,description,images,price_per_day`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (resp.ok) {
        const rows = await resp.json();
        const item = rows.find((r) => r.name && slugify(r.name) === slug);
        if (item) {
          title = `${item.name} - Travel Light Aruba`;
          const plain = (item.description || '').replace(/<[^>]*>/g, '').trim();
          description = plain
            ? `${plain.slice(0, 155)}${plain.length > 155 ? '...' : ''}`
            : `Rent ${item.name} in Aruba. Premium beach and baby equipment rentals.`;
          if (item.images && item.images[0]) {
            image = shareImage(item.images[0]);
            imageSize = null;
          }
          pageUrl = `${origin}/equipment/${slug}`;
        }
      }
    }
  } catch {
    if (isBlog) unavailable = true;
    // Equipment keeps its existing generic preview fallback.
  }

  if (isBlog && !found) {
    title = `${unavailable ? 'Story unavailable' : 'Story not found'} | Travel Light Aruba`;
    description = unavailable ? 'Please try again later.' : 'This story is not available.';
    image = LOGO_IMAGE;
    imageSize = LOGO_IMAGE_SIZE;
    pageUrl = `${origin}/blog`;
  }

  const imageType = imageSize?.type || imageMimeType(image);
  const sizeTags = imageSize
    ? `\n  <meta property="og:image:width" content="${imageSize.width}">\n  <meta property="og:image:height" content="${imageSize.height}">`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${isBlog ? 'article' : 'product'}">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
  <meta property="og:image:type" content="${escapeHtml(imageType)}">${sizeTags}
  <meta property="og:site_name" content="Travel Light Aruba">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
  ${isBlog && !found && !unavailable ? '<meta name="robots" content="noindex, nofollow">' : ''}
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <a href="${escapeHtml(pageUrl)}">View on Travel Light Aruba</a>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', isBlog ? 'no-store' : 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(isBlog && !found ? unavailable ? 503 : 404 : 200).send(html);
}
