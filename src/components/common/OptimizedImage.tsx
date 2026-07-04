import { ImgHTMLAttributes, useState, useEffect, useRef } from 'react';
import { getOptimizedImageProps, generateSizes, ImageConfig } from '@/utils/imageOptimization';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  containerClassName?: string;
  responsive?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
}

/**
 * OptimizedImage Component
 * Automatically handles lazy loading, responsive images, and modern formats
 */
export function OptimizedImage({
  src,
  alt,
  priority = false,
  sizes,
  responsive,
  containerClassName,
  className,
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate sizes if responsive config is provided
  const imgSizes = sizes || (responsive ? generateSizes(responsive) : undefined);

  // Get optimized props
  const imageConfig: ImageConfig = {
    src,
    alt,
    width: width as number | undefined,
    height: height as number | undefined,
    priority,
    sizes: imgSizes,
  };

  const optimizedProps = getOptimizedImageProps(imageConfig);

  useEffect(() => {
    // Preload priority images
    if (priority && src) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      if (imgSizes) {
        link.setAttribute('imagesizes', imgSizes);
      }
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [src, priority, imgSizes]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    console.error(`Failed to load image: ${src}`);
  };

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${containerClassName || ''}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-sm">Image failed to load</span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        ref={imgRef}
        {...optimizedProps}
        {...props}
        className={`${className || ''} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

/**
 * Simple wrapper for hero/banner images
 */
export function HeroImage(props: Omit<OptimizedImageProps, 'priority'>) {
  return <OptimizedImage {...props} priority={true} />;
}

/**
 * Gallery image with responsive sizing
 */
export function GalleryImage(props: OptimizedImageProps) {
  return (
    <OptimizedImage
      {...props}
      responsive={{
        mobile: '100vw',
        tablet: '50vw',
        desktop: '33vw',
      }}
    />
  );
}

/**
 * Thumbnail image
 */
export function ThumbnailImage(props: OptimizedImageProps) {
  return (
    <OptimizedImage
      {...props}
      responsive={{
        mobile: '25vw',
        tablet: '20vw',
        desktop: '10vw',
      }}
    />
  );
}
