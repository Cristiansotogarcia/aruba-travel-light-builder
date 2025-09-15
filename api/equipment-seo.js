export default async function handler(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only handle equipment routes
  if (!pathname.startsWith('/equipment/')) {
    return fetch(request);
  }

  try {
    // Extract equipment slug from URL
    const slug = pathname.replace('/equipment/', '').split('/')[0];

    if (!slug) {
      return fetch(request);
    }

    // Fetch equipment data from Supabase
    const equipmentData = await fetchEquipmentData(slug);

    if (!equipmentData) {
      return fetch(request);
    }

    // Generate HTML with meta tags
    const html = generateEquipmentHTML(equipmentData, pathname);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return fetch(request);
  }
}

async function fetchEquipmentData(slug) {
  try {
    // Supabase credentials from Vercel environment variables
    const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || 'https://abofxrgdxfzrhjbvhdkj.supabase.co';
    const SUPABASE_ANON_KEY = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_ANON_KEY) {
      throw new Error('VITE_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
    }

    // Convert slug back to equipment name for database lookup
    // Handle different slug formats
    let equipmentName = slug.replace(/-/g, ' ');

    // Try exact match first
    let response = await fetch(`${SUPABASE_URL}/rest/v1/equipment?name=eq.${encodeURIComponent(equipmentName)}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    let data = await response.json();

    // If no exact match, try case-insensitive search
    if (!data || data.length === 0) {
      response = await fetch(`${SUPABASE_URL}/rest/v1/equipment?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const allData = await response.json();
        // Find equipment with similar name (case-insensitive)
        data = allData.filter(item =>
          item.name && item.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(
            equipmentName.toLowerCase().replace(/[^a-z0-9]/g, '')
          )
        );
      }
    }

    return data && data.length > 0 ? data[0] : null;

  } catch (error) {
    console.error('Error fetching equipment data:', error);
    return null;
  }
}

function generateEquipmentHTML(equipment, pathname) {
  const title = `${equipment.name} - TLA Equipment Rentals`;
  const description = equipment.description
    ? equipment.description.substring(0, 155).replace(/<[^>]*>/g, '') + '...'
    : `Rent ${equipment.name} in Aruba. Premium beach and baby equipment rentals with delivery service.`;

  const image = equipment.images && equipment.images[0]
    ? equipment.images[0]
    : 'https://abofxrgdxfzrhjbvhdkj.supabase.co/storage/v1/object/public/site-assets/featured-products/beach-chair-1.jpg';

  const canonicalUrl = `https://travellightaruba.com${pathname}`;

  // Base HTML template with meta tags
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="https://abofxrgdxfzrhjbvhdkj.supabase.co/storage/v1/object/public/site-assets/favicon/1751031479742-TLA-Favicon.png">

    <title>${title}</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Travel Light Aruba">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${canonicalUrl}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">

    <!-- Canonical URL -->
    <link rel="canonical" href="${canonicalUrl}">

    <!-- Additional meta tags -->
    <meta name="robots" content="index, follow">
    <meta name="author" content="Travel Light Aruba">

    <!-- Preload critical resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <!-- Fallback for React app -->
    <script>
      // Simple loading indicator while React loads
      document.addEventListener('DOMContentLoaded', function() {
        const loader = document.createElement('div');
        loader.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:Arial,sans-serif;">Loading...</div>';
        document.body.appendChild(loader);
        setTimeout(() => loader.remove(), 2000);
      });
    </script>
</head>
<body>
    <div id="root">
        <!-- Prerendered content for better SEO -->
        <div style="min-height:100vh;display:flex;flex-direction:column;">
            <header style="background:#fff;border-bottom:1px solid #e5e7eb;padding:1rem 0;">
                <div style="max-width:1280px;margin:0 auto;padding:0 1rem;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <a href="/" style="font-size:1.5rem;font-weight:bold;color:#2563eb;text-decoration:none;">
                            Travel Light Aruba
                        </a>
                        <nav>
                            <a href="/equipment" style="margin-left:2rem;color:#374151;text-decoration:none;">Equipment</a>
                            <a href="/about" style="margin-left:2rem;color:#374151;text-decoration:none;">About</a>
                            <a href="/contact" style="margin-left:2rem;color:#374151;text-decoration:none;">Contact</a>
                        </nav>
                    </div>
                </div>
            </header>

            <main style="flex:1;padding:2rem 1rem;max-width:1280px;margin:0 auto;width:100%;">
                <div style="max-width:48rem;margin:0 auto;text-align:center;">
                    <h1 style="font-size:2.25rem;font-weight:bold;margin-bottom:1rem;">${equipment.name}</h1>
                    <div style="width:100%;max-width:24rem;margin:0 auto 2rem;">
                        ${equipment.images && equipment.images[0] ?
                          `<img src="${equipment.images[0]}" alt="${equipment.name}" style="width:100%;height:auto;border-radius:0.5rem;">` :
                          '<div style="width:100%;height:16rem;background:#f3f4f6;border-radius:0.5rem;display:flex;align-items:center;justify-content:center;color:#6b7280;">Image not available</div>'
                        }
                    </div>
                    <p style="color:#6b7280;margin-bottom:2rem;">${description}</p>
                    <div style="font-weight:600;margin-bottom:1rem;">
                        Price: $${equipment.price_per_day || 'N/A'}/day
                    </div>
                    <a href="/" style="display:inline-block;padding:0.75rem 1.5rem;background:#2563eb;color:#fff;text-decoration:none;border-radius:0.5rem;">
                        View All Equipment
                    </a>
                </div>
            </main>

            <footer style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:2rem 1rem;text-align:center;">
                <div style="max-width:1280px;margin:0 auto;">
                    <p style="color:#6b7280;">© 2024 Travel Light Aruba. Premium beach and baby equipment rentals.</p>
                </div>
            </footer>
        </div>
    </div>

    <!-- Load the React app -->
    <script type="module" crossorigin src="/assets/index-DiSNe05z.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-BAPf0Kx9.css">
</body>
</html>`;
}
