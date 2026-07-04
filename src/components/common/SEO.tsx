import React from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useQuery } from '@tanstack/react-query';
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
const DEFAULT_IMAGE = 'https://imagedelivery.net/KE7oljFadxNqgUvpxIG0Zg/b0ed7b8f-a7a0-4a00-810f-8b0f02e46500/public';
const SITE_URL = 'https://travelightaruba.com';

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
  productData,
  pageSlug
}) => {
  // Fetch SEO data for static pages via the shared query cache so revisiting a
  // page within the session doesn't refire the request.
  const { data: seoData = null, isLoading: loading } = useQuery<SEOMetaData | null>({
    queryKey: ['seo-meta', pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_meta')
        .select('*')
        .eq('page_slug', pageSlug as string)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching SEO data:', error);
      }
      return data ?? null;
    },
    enabled: Boolean(pageSlug && !productData),
    staleTime: 10 * 60 * 1000,
  });

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
      finalUrl = `${SITE_URL}/equipment/${productData.name.toLowerCase().replace(/\s+/g, '-')}`;
      type = 'product';
    }

    // Set image with priority: product images > provided image > database SEO > default
    if (productData && productData.images && productData.images[0]) {
      finalImage = productData.images[0]; // ✅ Prioritize Cloudflare URLs from equipment
    } else if (image && image !== null) {
      finalImage = image; // Use provided image (if not null)
    } else if (seoData?.og_image_url) {
      finalImage = seoData.og_image_url; // Fallback to database SEO data
    } else {
      finalImage = DEFAULT_IMAGE; // Final fallback
    }

    // Override other fields with database SEO data if available (but keep product image priority)
    if (seoData) {
      if (seoData.meta_title) finalTitle = seoData.meta_title;
      if (seoData.meta_description) finalDescription = seoData.meta_description;
      if (seoData.canonical_url) finalUrl = seoData.canonical_url;
      // Note: og_image_url is handled above with priority logic
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
      <meta property="og:image" content={meta.image} />
      <meta property="og:url" content={meta.url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Travel Light Aruba" />

      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoData?.twitter_title || meta.title} />
      <meta name="twitter:description" content={seoData?.og_description || meta.description} />
      <meta name="twitter:image" content={meta.image} />

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
