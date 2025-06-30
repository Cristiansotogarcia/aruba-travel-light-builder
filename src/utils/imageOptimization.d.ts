/**
 * Image optimization utilities for better performance and user experience
 */
export interface CompressionOptions {
    quality: number;
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
export declare const compressImage: (file: File, quality?: number, options?: Partial<CompressionOptions>) => Promise<File>;
/**
 * Advanced image compression with multiple optimization strategies
 */
export declare const optimizeImage: (file: File, options?: Partial<CompressionOptions>) => Promise<OptimizationResult>;
/**
 * Gets the dimensions of an image file
 */
export declare const getImageDimensions: (file: File) => Promise<ImageDimensions>;
/**
 * Calculates optimal dimensions while maintaining aspect ratio
 */
export declare const calculateDimensions: (originalWidth: number, originalHeight: number, maxWidth: number, maxHeight: number, maintainAspectRatio?: boolean) => ImageDimensions;
/**
 * Creates a thumbnail from an image file
 */
export declare const createThumbnail: (file: File, size?: number, quality?: number) => Promise<File>;
/**
 * Converts an image to a different format
 */
export declare const convertImageFormat: (file: File, format: "jpeg" | "png" | "webp", quality?: number) => Promise<File>;
/**
 * Checks if the browser supports WebP format
 */
export declare const supportsWebP: () => Promise<boolean>;
/**
 * Batch optimize multiple images
 */
export declare const optimizeImages: (files: File[], options?: Partial<CompressionOptions>, onProgress?: (index: number, total: number, result: OptimizationResult) => void) => Promise<OptimizationResult[]>;
/**
 * Utility to format file size for display
 */
export declare const formatFileSize: (bytes: number) => string;
/**
 * Utility to calculate compression percentage
 */
export declare const calculateCompressionPercentage: (originalSize: number, compressedSize: number) => number;
