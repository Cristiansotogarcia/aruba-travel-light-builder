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
declare class EnhancedCloudflareUploadService {
    private readonly defaultOptions;
    /**
     * Validates a file before upload
     */
    validateFile(file: File): {
        success: boolean;
        error?: string;
    };
    /**
     * Uploads an image with enhanced error handling and retry logic
     */
    uploadImage(file: File, options?: UploadOptions, onProgress?: (progress: UploadProgress) => void): Promise<CloudflareUploadResponse>;
    /**
     * Upload with retry logic
     */
    private uploadWithRetry;
    /**
     * Determines if an error is retryable
     */
    private shouldRetry;
    /**
     * Gets image URL with caching
     */
    getImageUrl(imageId: string, variant?: string): string;
    /**
     * Batch upload multiple images
     */
    uploadMultipleImages(files: File[], options?: UploadOptions, onProgress?: (fileIndex: number, progress: UploadProgress) => void): Promise<CloudflareUploadResponse[]>;
    /**
     * Preload image for better UX
     */
    preloadImage(imageId: string, variant?: string): Promise<void>;
    /**
     * Clear image cache
     */
    clearCache(): void;
}
export declare const enhancedCloudflareUploadService: EnhancedCloudflareUploadService;
export default enhancedCloudflareUploadService;
