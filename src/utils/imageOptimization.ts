/**
 * Image optimization utilities for better performance and user experience
 */

import { logger } from './logger';

export interface CompressionOptions {
  quality: number; // 0.1 to 1.0
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface OptimizationResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: ImageDimensions;
}

/**
 * Compresses an image file with specified options
 */
export const compressImage = async (
  file: File,
  quality: number = 0.8,
  options: Partial<CompressionOptions> = {}
): Promise<File> => {
  const opts: CompressionOptions = {
    quality,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'jpeg',
    maintainAspectRatio: true,
    ...options
  };

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        const { width, height } = calculateDimensions(
          img.width,
          img.height,
          opts.maxWidth!,
          opts.maxHeight!,
          opts.maintainAspectRatio!
        );

        canvas.width = width;
        canvas.height = height;

        // Apply image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with specified format and quality
        const mimeType = `image/${opts.format}`;
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now()
            });

            logger.debug('Image compressed successfully', {
              originalSize: file.size,
              compressedSize: compressedFile.size,
              compressionRatio: ((file.size - compressedFile.size) / file.size * 100).toFixed(2) + '%',
              dimensions: { width, height }
            });

            resolve(compressedFile);
          },
          mimeType,
          opts.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Advanced image compression with multiple optimization strategies
 */
export const optimizeImage = async (
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<OptimizationResult> => {
  const originalSize = file.size;
  const originalDimensions = await getImageDimensions(file);

  logger.info('Starting image optimization', {
    fileName: file.name,
    originalSize,
    originalDimensions
  });

  // Try different compression strategies
  const strategies = [
    { quality: 0.9, format: 'webp' as const },
    { quality: 0.8, format: 'jpeg' as const },
    { quality: 0.7, format: 'jpeg' as const },
    { quality: 0.6, format: 'jpeg' as const }
  ];

  let bestResult: File = file;
  let bestSize = originalSize;

  for (const strategy of strategies) {
    try {
      const compressed = await compressImage(file, strategy.quality, {
        ...options,
        format: strategy.format
      });

      if (compressed.size < bestSize) {
        bestResult = compressed;
        bestSize = compressed.size;
      }

      // If we achieve good compression (>30% reduction), use it
      if ((originalSize - compressed.size) / originalSize > 0.3) {
        bestResult = compressed;
        break;
      }
    } catch (error) {
      logger.warn(`Compression strategy failed`, { strategy, error });
    }
  }

  const finalDimensions = await getImageDimensions(bestResult);
  const compressionRatio = ((originalSize - bestSize) / originalSize) * 100;

  logger.info('Image optimization completed', {
    fileName: file.name,
    originalSize,
    compressedSize: bestSize,
    compressionRatio: compressionRatio.toFixed(2) + '%',
    finalDimensions
  });

  return {
    file: bestResult,
    originalSize,
    compressedSize: bestSize,
    compressionRatio,
    dimensions: finalDimensions
  };
};

/**
 * Gets the dimensions of an image file
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension calculation'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculates optimal dimensions while maintaining aspect ratio
 */
export const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  maintainAspectRatio: boolean = true
): ImageDimensions => {
  if (!maintainAspectRatio) {
    return {
      width: Math.min(originalWidth, maxWidth),
      height: Math.min(originalHeight, maxHeight)
    };
  }

  const aspectRatio = originalWidth / originalHeight;
  
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if necessary
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
};

/**
 * Creates a thumbnail from an image file
 */
export const createThumbnail = async (
  file: File,
  size: number = 150,
  quality: number = 0.8
): Promise<File> => {
  return compressImage(file, quality, {
    maxWidth: size,
    maxHeight: size,
    format: 'jpeg',
    maintainAspectRatio: true
  });
};

/**
 * Converts an image to a different format
 */
export const convertImageFormat = async (
  file: File,
  format: 'jpeg' | 'png' | 'webp',
  quality: number = 0.9
): Promise<File> => {
  return compressImage(file, quality, {
    format,
    maxWidth: undefined, // Don't resize
    maxHeight: undefined
  });
};

/**
 * Checks if the browser supports WebP format
 */
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Batch optimize multiple images
 */
export const optimizeImages = async (
  files: File[],
  options: Partial<CompressionOptions> = {},
  onProgress?: (index: number, total: number, result: OptimizationResult) => void
): Promise<OptimizationResult[]> => {
  const results: OptimizationResult[] = [];
  
  logger.info('Starting batch image optimization', { fileCount: files.length });

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await optimizeImage(files[i], options);
      results.push(result);
      onProgress?.(i + 1, files.length, result);
    } catch (error) {
      logger.error(`Failed to optimize image ${i + 1}/${files.length}`, {
        fileName: files[i].name,
        error
      });
      
      // Create a fallback result with the original file
      const fallbackResult: OptimizationResult = {
        file: files[i],
        originalSize: files[i].size,
        compressedSize: files[i].size,
        compressionRatio: 0,
        dimensions: await getImageDimensions(files[i]).catch(() => ({ width: 0, height: 0 }))
      };
      
      results.push(fallbackResult);
      onProgress?.(i + 1, files.length, fallbackResult);
    }
  }

  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const overallCompressionRatio = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100;

  logger.info('Batch image optimization completed', {
    fileCount: files.length,
    totalOriginalSize,
    totalCompressedSize,
    overallCompressionRatio: overallCompressionRatio.toFixed(2) + '%'
  });

  return results;
};

/**
 * Utility to format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Utility to calculate compression percentage
 */
export const calculateCompressionPercentage = (
  originalSize: number,
  compressedSize: number
): number => {
  return ((originalSize - compressedSize) / originalSize) * 100;
};