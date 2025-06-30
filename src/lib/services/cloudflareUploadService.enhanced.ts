import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { AppError, handleApiError } from '@/utils/errorHandling';
import { imageUploadSchema } from '@/utils/validation';
import { compressImage } from '@/utils/imageOptimization';
import { imageCache } from '@/utils/cache';

// Enhanced interfaces with better type safety
export interface CloudflareUploadResponse {
  success: boolean;
  result?: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
  errors?: Array<{
    code: number;
    message: string;
  }>;
  messages?: string[];
}

export interface UploadOptions {
  compress?: boolean;
  quality?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class EnhancedCloudflareUploadService {
  private readonly defaultOptions: Required<UploadOptions> = {
    compress: true,
    quality: 0.8,
    maxRetries: 3,
    timeout: 30000
  };

  /**
   * Validates a file before upload
   */
  validateFile(file: File): { success: boolean; error?: string } {
    try {
      const validation = imageUploadSchema.safeParse({ file });
      
      if (!validation.success) {
        const errorMessage = validation.error.errors
          .map(err => err.message)
          .join(', ');
        return { success: false, error: errorMessage };
      }
      
      return { success: true };
    } catch (error) {
      logger.error('File validation error:', error);
      return { success: false, error: 'File validation failed' };
    }
  }

  /**
   * Uploads an image with enhanced error handling and retry logic
   */
  async uploadImage(
    file: File, 
    options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<CloudflareUploadResponse> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.success) {
      throw new AppError(validation.error!, 'VALIDATION_ERROR', 400);
    }

    let processedFile = file;
    
    // Compress image if requested
    if (opts.compress) {
      try {
        logger.info('Compressing image', { originalSize: file.size });
        processedFile = await compressImage(file, opts.quality);
        logger.info('Image compressed', { 
          originalSize: file.size, 
          compressedSize: processedFile.size,
          compressionRatio: ((file.size - processedFile.size) / file.size * 100).toFixed(2) + '%'
        });
      } catch (error) {
        logger.warn('Image compression failed, using original file', error);
        processedFile = file;
      }
    }

    return this.uploadWithRetry(processedFile, opts, onProgress);
  }

  /**
   * Upload with retry logic
   */
  private async uploadWithRetry(
    file: File,
    options: Required<UploadOptions>,
    onProgress?: (progress: UploadProgress) => void,
    attempt: number = 1
  ): Promise<CloudflareUploadResponse> {
    try {
      logger.info(`Upload attempt ${attempt}/${options.maxRetries}`, {
        fileName: file.name,
        fileSize: file.size
      });

      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress for form data preparation
      onProgress?.({ loaded: 0, total: file.size, percentage: 0 });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      try {
        const { data, error } = await supabase.functions.invoke('cloudflare-image-upload', {
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        clearTimeout(timeoutId);

        if (error) {
          throw new AppError(
            `Upload failed: ${error.message}`,
            'UPLOAD_ERROR',
            500
          );
        }

        if (!data) {
          throw new AppError(
            'No response data received',
            'NO_DATA_ERROR',
            500
          );
        }

        // Simulate completion progress
        onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });

        const response = data as CloudflareUploadResponse;
        
        if (!response.success) {
          const errorMessage = response.errors?.[0]?.message || 'Upload failed';
          throw new AppError(errorMessage, 'CLOUDFLARE_ERROR', 400);
        }

        logger.info('Upload successful', {
          imageId: response.result?.id,
          fileName: file.name
        });

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      const appError = handleApiError(error);
      
      logger.error(`Upload attempt ${attempt} failed`, {
        error: appError.message,
        fileName: file.name,
        attempt
      });

      // Retry logic
      if (attempt < options.maxRetries && this.shouldRetry(appError)) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
        logger.info(`Retrying upload in ${delay}ms`, { attempt: attempt + 1 });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.uploadWithRetry(file, options, onProgress, attempt + 1);
      }

      throw appError;
    }
  }

  /**
   * Determines if an error is retryable
   */
  private shouldRetry(error: AppError): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT_ERROR' ||
      (error.statusCode >= 500 && error.statusCode < 600)
    );
  }

  /**
   * Gets image URL with caching
   */
  getImageUrl(imageId: string, variant: string = 'public'): string {
    const cacheKey = `image_url_${imageId}_${variant}`;
    const cachedUrl = imageCache.get(cacheKey);
    
    if (cachedUrl) {
      return cachedUrl;
    }

    const url = `https://imagedelivery.net/${import.meta.env.VITE_CLOUDFLARE_IMAGES_HASH}/${imageId}/${variant}`;
    imageCache.set(cacheKey, url);
    
    return url;
  }

  /**
   * Batch upload multiple images
   */
  async uploadMultipleImages(
    files: File[],
    options: UploadOptions = {},
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<CloudflareUploadResponse[]> {
    logger.info('Starting batch upload', { fileCount: files.length });
    
    const results: CloudflareUploadResponse[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadImage(
          files[i],
          options,
          (progress) => onProgress?.(i, progress)
        );
        results.push(result);
      } catch (error) {
        logger.error(`Failed to upload file ${i + 1}/${files.length}`, error);
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      logger.warn(`Batch upload completed with ${errors.length} errors`, {
        successCount: results.length,
        errorCount: errors.length
      });
    } else {
      logger.info('Batch upload completed successfully', {
        fileCount: results.length
      });
    }

    return results;
  }

  /**
   * Preload image for better UX
   */
  async preloadImage(imageId: string, variant: string = 'public'): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to preload image'));
      img.src = this.getImageUrl(imageId, variant);
    });
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    imageCache.clear();
    logger.info('Image cache cleared');
  }
}

// Export singleton instance
export const enhancedCloudflareUploadService = new EnhancedCloudflareUploadService();
export default enhancedCloudflareUploadService;