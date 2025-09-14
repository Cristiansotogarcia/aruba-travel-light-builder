import React from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  productData?: {
    id: string;
    name: string;
    description?: string;
    images?: string[];
    price?: number;
    category?: string;
  };
  pageSlug?: string; // For static pages that use seo_meta table
}

interface SEOMetaData {
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  twitter_title?: string | null;
  twitter_image_url?: string | null;
  canonical_url?: string | null;
}

const DEFAULT_TITLE = 'TLA - Premium Beach & Baby Equipment Rentals in Aruba';
const DEFAULT_DESCRIPTION = 'Premium Beach & Baby Equipment Rentals in Aruba';
const DEFAULT_IMAGE = 'https://abofxrgdxfzrhjbvhdkj.supabase.co/storage/v1/object/public/site-assets/favicon/1751031479742-TLA-Favicon.png';
const SITE_URL = 'https://travellightaruba.com';

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
  productData,
  pageSlug
}) => {
  const [seoData, setSeoData] = React.useState<SEOMetaData | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Fetch SEO data from database for static pages
  React.useEffect(() => {
    if (pageSlug && !productData) {
      const fetchSEOData = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('seo_meta')
            .select('*')
            .eq('page_slug', pageSlug)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching SEO data:', error);
          } else if (data) {
            setSeoData(data);
          }
        } catch (error) {
          console.error('Error fetching SEO data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchSEOData();
    }
  }, [pageSlug, productData]);

  // Generate meta tags based on available data
  const generateMetaTags = () => {
    let finalTitle = title || DEFAULT_TITLE;
    let finalDescription = description || DEFAULT_DESCRIPTION;
    let finalImage = image || DEFAULT_IMAGE;
    let finalUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);

    // If we have product data, generate SEO from product
    if (productData) {
      finalTitle = `${productData.name} - TLA Equipment Rentals`;
      finalDescription = productData.description
        ? `${productData.description.substring(0, 155)}...`
        : `Rent ${productData.name} in Aruba. Premium beach and baby equipment rentals with delivery service.`;
      finalImage = productData.images && productData.images[0] ? productData.images[0] : DEFAULT_IMAGE;
      finalUrl = `${SITE_URL}/equipment/${productData.name.toLowerCase().replace(/\s+/g, '-')}`;
      type = 'product';
    }

    // Override with database SEO data if available (for static pages)
    if (seoData) {
      if (seoData.meta_title) finalTitle = seoData.meta_title;
      if (seoData.meta_description) finalDescription = seoData.meta_description;
      if (seoData.og_image_url) finalImage = seoData.og_image_url;
      if (seoData.canonical_url) finalUrl = seoData.canonical_url;
    }

    return {
      title: finalTitle,
      description: finalDescription,
      image: finalImage,
      url: finalUrl,
      type
    };
  };

  const meta = generateMetaTags();

  // Don't render anything while loading SEO data for static pages
  if (loading && pageSlug && !productData) {
    return null;
  }

  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />

      {/* Canonical URL */}
      <link rel="canonical" href={meta.url} />

      {/* Open Graph meta tags */}
      <meta property="og:title" content={seoData?.og_title || meta.title} />
      <meta property="og:description" content={seoData?.og_description || meta.description} />
      <meta property="og:image" content={seoData?.og_image_url || meta.image} />
      <meta property="og:url" content={meta.url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Travel Light Aruba" />

      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@travellightaruba" />
      <meta name="twitter:title" content={seoData?.twitter_title || meta.title} />
      <meta name="twitter:description" content={seoData?.og_description || meta.description} />
      <meta name="twitter:image" content={seoData?.twitter_image_url || meta.image} />

      {/* Product-specific meta tags */}
      {productData && (
        <>
          <meta property="product:price:amount" content={productData.price?.toString()} />
          <meta property="product:price:currency" content="USD" />
          {productData.category && (
            <meta property="product:category" content={productData.category} />
          )}
        </>
      )}

      {/* Additional meta tags for better social media support */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content="Travel Light Aruba" />
    </Helmet>
  );
};

export default SEO;
