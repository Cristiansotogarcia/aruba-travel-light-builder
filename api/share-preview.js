// Social-share preview for equipment pages.
//
// Social crawlers (WhatsApp, Facebook, X, ...) don't execute JavaScript, so
// they never see the React-rendered og: tags. vercel.json rewrites
// /equipment/:slug to this function for crawler user-agents only; it returns
// a minimal HTML document whose og:image is the product photo, falling back
// to the TLA logo. Regular visitors never hit this code path.

const SUPABASE_URL =
  process.env.VITE_PUBLIC_SUPABASE_URL || 'https://abofxrgdxfzrhjbvhdkj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

const SITE_URL = 'https://travelightaruba.com';
const LOGO_IMAGE =
  'https://imagedelivery.net/KE7oljFadxNqgUvpxIG0Zg/b0ed7b8f-a7a0-4a00-810f-8b0f02e46500/public';

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

export default async function handler(req, res) {
  const slug = String(req.query.slug || '');

  let title = 'TLA - Premium Beach & Baby Equipment Rentals in Aruba';
  let description = 'Premium Beach & Baby Equipment Rentals in Aruba';
  let image = LOGO_IMAGE;
  let pageUrl = `${SITE_URL}/equipment`;

  try {
    if (slug && SUPABASE_ANON_KEY) {
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
          }
          pageUrl = `${SITE_URL}/equipment/${slug}`;
        }
      }
    }
  } catch {
    // fall through with defaults — a broken preview beats a 500 for crawlers
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="Travel Light Aruba">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <a href="${escapeHtml(pageUrl)}">View on Travel Light Aruba</a>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
}
