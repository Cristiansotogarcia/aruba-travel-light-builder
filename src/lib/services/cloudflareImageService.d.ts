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
declare class CloudflareImageService {
    private accountId;
    private supabaseUrl;
    private supabaseKey;
    constructor();
    listImages(page?: number, perPage?: number, continuationToken?: string): Promise<CloudflareImagesResponse>;
    getImageDetails(imageId: string): Promise<CloudflareImage>;
    getImageUrl(imageId: string, variant?: string): string;
    isConfigured(): boolean;
}
export declare const cloudflareImageService: CloudflareImageService;
export type { CloudflareImage, CloudflareImagesResponse };
