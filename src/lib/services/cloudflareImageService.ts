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
  private accountId: string;
  private supabaseUrl: string;
  private supabaseKey: string;
  private proxyUrl: string;

  constructor() {
    this.accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '';
    this.supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';
    this.proxyUrl = `${this.supabaseUrl}/functions/v1/cloudflare-images-proxy`;
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

      return data.result;
    } catch (err) {
      console.error('Error fetching image details:', err);
      throw err;
    }
  }

  getImageUrl(imageId: string, variant = 'public'): string {
    return `https://imagedelivery.net/${this.accountId}/${imageId}/${variant}`;
  }

  isConfigured(): boolean {
    return !!(this.accountId && this.supabaseUrl && this.supabaseKey);
  }
}

export const cloudflareImageService = new CloudflareImageService();
export type { CloudflareImage, CloudflareImagesResponse };