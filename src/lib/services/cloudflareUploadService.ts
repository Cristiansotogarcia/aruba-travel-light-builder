import { supabase } from '@/integrations/supabase/client';

interface CloudflareUploadResponse {
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
}

class CloudflareUploadService {
  async uploadImage(file: File, metadata?: Record<string, unknown>): Promise<CloudflareUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const { data, error } = await supabase.functions.invoke<CloudflareUploadResponse>(
        'cloudflare-image-upload',
        {
          body: formData,
        }
      );

      // console.log('Cloudflare upload service - raw response:', { data, error });

      if (error) {
        throw error;
      }

      return data as CloudflareUploadResponse;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  getImageUrl(imageId: string, variant: string = 'public'): string {
    // Since we don't store the account ID in frontend, we'll need to get it from the Edge Function
    // or store it in the image data. For now, return a placeholder that should be handled by the backend.
    console.warn('getImageUrl called without account ID. Consider storing full URLs in the database.');
    return `https://imagedelivery.net/ACCOUNT_ID_NEEDED/${imageId}/${variant}`;
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'Only image files are allowed' };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    return { valid: true };
  }
}

export const cloudflareUploadService = new CloudflareUploadService();
export type { CloudflareUploadResponse };
