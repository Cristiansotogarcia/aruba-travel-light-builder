import { useMemo } from 'react';

interface ProductSEOData {
  id: string;
  name: string;
  description?: string;
  images?: string[];
  price?: number;
  category?: string;
  slug?: string;
}

interface SEOConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  pageSlug?: string;
}

export const useSEO = (config: SEOConfig = {}) => {
  const seoConfig = useMemo(() => {
    return {
      title: config.title,
      description: config.description,
      image: config.image,
      url: config.url,
      type: config.type || 'website',
      pageSlug: config.pageSlug,
    };
  }, [config]);

  const generateProductSEO = (product: ProductSEOData) => {
    const imageUrl = product.images && product.images[0] ? product.images[0] : null;

    return {
      title: `${product.name} - TLA Equipment Rentals`,
      description: product.description
        ? `${product.description.substring(0, 155)}...`
        : `Rent ${product.name} in Aruba. Premium beach and baby equipment rentals with delivery service.`,
      image: imageUrl,
      url: `${typeof window !== 'undefined' ? window.location.origin : 'https://travellightaruba.com'}/equipment/${product.slug || product.name.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'product' as const,
      productData: {
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        price: product.price,
        category: product.category,
      },
    };
  };

  const generatePageSEO = (pageSlug: string, overrides: Partial<SEOConfig> = {}) => {
    return {
      ...seoConfig,
      pageSlug,
      ...overrides,
    };
  };

  return {
    seoConfig,
    generateProductSEO,
    generatePageSEO,
  };
};

export default useSEO;
