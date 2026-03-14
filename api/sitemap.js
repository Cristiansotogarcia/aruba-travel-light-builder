export default async function handler(request) {
  const url = new URL(request.url);

  try {
    // Fetch equipment data from Supabase
    const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || 'https://abofxrgdxfzrhjbvhdkj.supabase.co';
    const SUPABASE_ANON_KEY = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFib2Z4cmdkeGZ6cmhqYnZoZGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4NjQ4NTUsImV4cCI6MjA1MDQ0MDg1NX0.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8';

    if (!SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not available');
    }

    // Fetch all equipment
    const response = await fetch(`${SUPABASE_URL}/rest/v1/equipment?select=name,updated_at&is_active=eq.true`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch equipment data');
    }

    const equipment = await response.json();

    // Generate sitemap XML
    const baseUrl = 'https://travellightaruba.com';
    const currentDate = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- About Page -->
  <url>
    <loc>${baseUrl}/about-us</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Equipment Pages -->
  <url>
    <loc>${baseUrl}/equipment</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Contact Page -->
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Booking Page -->
  <url>
    <loc>${baseUrl}/book</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Add equipment items
    equipment.forEach(item => {
      const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const lastmod = item.updated_at ? new Date(item.updated_at).toISOString().split('T')[0] : currentDate;

      sitemap += `
  <url>
    <loc>${baseUrl}/equipment/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Sitemap generation error:', error);

    // Return basic sitemap on error
    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://travellightaruba.com/</loc>
    <lastmod>2025-11-11</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://travellightaruba.com/equipment</loc>
    <lastmod>2025-11-11</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://travellightaruba.com/about-us</loc>
    <lastmod>2025-11-11</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    return new Response(basicSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes on error
      },
    });
  }
}
