/**
 * Image Optimization Utilities
 * Provides helpers for responsive images, lazy loading, and format optimization
 */

export interface ImageConfig {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
}

/**
 * Generate srcset for responsive images
 * @param src - Base image URL
 * @param widths - Array of widths for different screen sizes
 */
export function generateSrcSet(src: string, widths: number[] = [320, 640, 768, 1024, 1280, 1920]): string {
  return widths
    .map(width => {
      // Check if Cloudflare Images is being used
      if (src.includes('imagedelivery.net')) {
        return `${src}?width=${width} ${width}w`;
      }
      // For other images, return as is with width descriptor
      return `${src} ${width}w`;
    })
    .join(', ');
}

/**
 * Generate sizes attribute based on common breakpoints
 */
export function generateSizes(config?: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}): string {
  const {
    mobile = '100vw',
    tablet = '50vw',
    desktop = '33vw'
  } = config || {};

  return `(max-width: 640px) ${mobile}, (max-width: 1024px) ${tablet}, ${desktop}`;
}

/**
 * Check if image should use lazy loading
 * @param priority - Whether image is above the fold
 */
export function shouldLazyLoad(priority: boolean = false): 'lazy' | 'eager' {
  return priority ? 'eager' : 'lazy';
}

/**
 * Get optimized image props for React img element
 */
export function getOptimizedImageProps(config: ImageConfig) {
  const { src, alt, width, height, priority = false, sizes } = config;

  return {
    src,
    alt,
    width,
    height,
    loading: shouldLazyLoad(priority),
    decoding: (priority ? 'sync' : 'async') as 'sync' | 'async' | 'auto',
    ...(sizes && { sizes }),
    // Add srcset for Cloudflare Images
    ...(src.includes('imagedelivery.net') && {
      srcSet: generateSrcSet(src)
    })
  };
}

/**
 * Preload critical images
 * @param images - Array of image URLs to preload
 */
export function preloadImages(images: string[]) {
  if (typeof window === 'undefined') return;

  images.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
}

/**
 * Convert image URL to WebP if supported
 * Note: Cloudflare Images automatically serves WebP when supported
 */
export function getWebPUrl(src: string): string {
  // Cloudflare Images handles format automatically
  if (src.includes('imagedelivery.net')) {
    return `${src}?format=auto`;
  }
  // For other images, check if browser supports WebP
  return src;
}

/**
 * Lazy load images using Intersection Observer
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;

  constructor() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            const srcset = img.dataset.srcset;

            if (src) {
              img.src = src;
            }
            if (srcset) {
              img.srcset = srcset;
            }

            img.classList.remove('lazy');
            this.observer?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Load images 50px before they enter viewport
        threshold: 0.01
      }
    );
  }

  observe(element: HTMLElement) {
    this.observer?.observe(element);
  }

  disconnect() {
    this.observer?.disconnect();
  }
}

// Export singleton instance
export const lazyImageLoader = new LazyImageLoader();
