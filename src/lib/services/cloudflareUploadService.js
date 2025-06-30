import { supabase } from '@/integrations/supabase/client';
class CloudflareUploadService {
    async uploadImage(file, metadata) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (metadata) {
                formData.append('metadata', JSON.stringify(metadata));
            }
            const { data, error } = await supabase.functions.invoke('cloudflare-image-upload', {
                body: formData,
            });
            if (error) {
                throw error;
            }
            return data;
        }
        catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }
    getImageUrl(imageId, variant = 'public') {
        // Get account ID from environment or use a default format
        const accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;
        if (accountId) {
            return `https://imagedelivery.net/${accountId}/${imageId}/${variant}`;
        }
        // Fallback: return the imageId as-is (might be a full URL already)
        return imageId;
    }
    validateFile(file) {
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
