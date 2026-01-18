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
declare class CloudflareUploadService {
    uploadImage(file: File, metadata?: Record<string, unknown>): Promise<CloudflareUploadResponse>;
    getImageUrl(imageId: string, variant?: string): string;
    validateFile(file: File): {
        valid: boolean;
        error?: string;
    };
}
export declare const cloudflareUploadService: CloudflareUploadService;
export type { CloudflareUploadResponse };
