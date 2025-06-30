interface CloudflareImage {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
  meta?: Record<string, any>;
}

interface CloudflareImagesResponse {
  result: {
    images: CloudflareImage[];
    count: number;
    continuation_token?: string;
  };
  success: boolean;
  errors: any[];
  messages: any[];
}

import { supabase } from '@/integrations/supabase/client';

class CloudflareImageService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';
  }

  async listImages(page = 1, perPage = 50, continuationToken?: string): Promise<CloudflareImagesResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      if (continuationToken) {
        params.append('continuation_token', continuationToken);
      }

      const { data, error: invokeError } = await supabase.functions.invoke<CloudflareImagesResponse>(
        `cloudflare-images-proxy?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.supabaseKey,
            Authorization: `Bearer ${this.supabaseKey}`,
          },
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data) {
        throw new Error('No data received from Cloudflare Images API');
      }

      return data;
    } catch (err) {
      console.error('Error fetching Cloudflare images:', err);
      throw err;
    }
  }

  async getImageDetails(imageId: string): Promise<CloudflareImage> {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<{ result: CloudflareImage }>(
        `cloudflare-images-proxy/${imageId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.supabaseKey,
            Authorization: `Bearer ${this.supabaseKey}`,
          },
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data || !data.result) {
        throw new Error('No image data received from Cloudflare Images API');
      }

      return data.result;
    } catch (err) {
      console.error('Error fetching image details:', err);
      throw err;
    }
  }

  getImageUrl(imageId: string, variant = 'public'): string {
    // Since we don't store the account ID in frontend, we'll need to get it from the Edge Function
    // or store it in the image data. For now, return a placeholder that should be handled by the backend.
    console.warn('getImageUrl called without account ID. Consider storing full URLs in the database.');
    return `https://imagedelivery.net/ACCOUNT_ID_NEEDED/${imageId}/${variant}`;
  }

  isConfigured(): boolean {
    return !!(this.supabaseUrl && this.supabaseKey);
  }
}

export const cloudflareImageService = new CloudflareImageService();
export type { CloudflareImage, CloudflareImagesResponse };