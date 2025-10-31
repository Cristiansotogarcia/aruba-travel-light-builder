import { supabase } from '@/integrations/supabase/client';

export class Prerenderer {
  private static SITE_URL = 'https://travellightaruba.com';
  private static DEFAULT_IMAGE = 'https://abofxrgdxfzrhjbvhdkj.supabase.co/storage/v1/object/public/site-assets/featured-products/beach-chair-1.jpg';

  static async getProductSEOData(slug: string): Promise<{
    title: string;
    description: string;
    image: string;
    url: string;
  } | null> {
    try {
      // Fetch product data from Supabase
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description, images, price_per_day, equipment_category(name)')
        .eq('name', slug.replace(/-/g, ' '))
        .single();

      if (error || !products) {
        console.error('Error fetching product:', error);
        return null;
      }

      const product = products as any;

      return {
        title: `${product.name} - TLA Equipment Rentals`,
        description: product.description
          ? `${product.description.substring(0, 155)}...`
          : `Rent ${product.name} in Aruba. Premium beach and baby equipment rentals with delivery service.`,
        image: product.images && product.images[0] ? product.images[0] : this.DEFAULT_IMAGE,
        url: `${this.SITE_URL}/equipment/${slug}`,
      };
    } catch (error) {
      console.error('Error in getProductSEOData:', error);
      return null;
    }
  }

  static generatePrerenderedHTML(seoData: {
    title: string;
    description: string;
    image: string;
    url: string;
  } | null, isProductPage: boolean = false): string {
    const title = seoData?.title || 'TLA - Premium Beach & Baby Equipment Rentals in Aruba';
    const description = seoData?.description || 'Premium Beach & Baby Equipment Rentals in Aruba';
    const image = seoData?.image || this.DEFAULT_IMAGE;
    const url = seoData?.url || this.SITE_URL;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      rel="icon"
      type="image/png"
      href="https://abofxrgdxfzrhjbvhdkj.supabase.co/storage/v1/object/public/site-assets/favicon/1751031479742-TLA-Favicon.png"
    />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="author" content="Travel Light Aruba" />

    <!-- Open Graph meta tags for social media -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="${isProductPage ? 'product' : 'website'}" />
    <meta property="og:site_name" content="Travel Light Aruba" />

    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@travellightaruba" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />

    <!-- Canonical URL -->
    <link rel="canonical" href="${url}" />

    <!-- Additional meta tags -->
    <meta name="robots" content="index, follow" />
    <meta name="author" content="Travel Light Aruba" />

    <script defer src="https://cloud.umami.is/script.js" data-website-id="79d3968a-436f-4946-9d49-a87feb3a65c4"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }

  static isSocialMediaCrawler(userAgent: string): boolean {
    const crawlers = [
      'facebookexternalhit',
      'facebookcatalog',
      'twitterbot',
      'linkedinbot',
      'whatsapp',
      'slackbot',
      'telegrambot',
      'discordbot',
      'skypeuripreview',
      'pinterest',
      'tiktok',
      'snapchat'
    ];

    const lowerUserAgent = userAgent.toLowerCase();
    return crawlers.some(crawler => lowerUserAgent.includes(crawler));
  }
}

export default Prerenderer;
