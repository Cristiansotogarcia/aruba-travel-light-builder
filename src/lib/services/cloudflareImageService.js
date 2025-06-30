import { supabase } from '@/integrations/supabase/client';
class CloudflareImageService {
    constructor() {
        Object.defineProperty(this, "accountId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "supabaseUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "supabaseKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '';
        this.supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || '';
        this.supabaseKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';
    }
    async listImages(page = 1, perPage = 50, continuationToken) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (continuationToken) {
                params.append('continuation_token', continuationToken);
            }
            const { data, error: invokeError } = await supabase.functions.invoke(`cloudflare-images-proxy?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: this.supabaseKey,
                    Authorization: `Bearer ${this.supabaseKey}`,
                },
            });
            if (invokeError) {
                throw new Error(invokeError.message);
            }
            if (!data) {
                throw new Error('No data received from Cloudflare Images API');
            }
            return data;
        }
        catch (err) {
            console.error('Error fetching Cloudflare images:', err);
            throw err;
        }
    }
    async getImageDetails(imageId) {
        try {
            const { data, error: invokeError } = await supabase.functions.invoke(`cloudflare-images-proxy/${imageId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: this.supabaseKey,
                    Authorization: `Bearer ${this.supabaseKey}`,
                },
            });
            if (invokeError) {
                throw new Error(invokeError.message);
            }
            if (!data || !data.result) {
                throw new Error('No image data received from Cloudflare Images API');
            }
            return data.result;
        }
        catch (err) {
            console.error('Error fetching image details:', err);
            throw err;
        }
    }
    getImageUrl(imageId, variant = 'public') {
        return `https://imagedelivery.net/${this.accountId}/${imageId}/${variant}`;
    }
    isConfigured() {
        return !!(this.accountId && this.supabaseUrl && this.supabaseKey);
    }
}
export const cloudflareImageService = new CloudflareImageService();
