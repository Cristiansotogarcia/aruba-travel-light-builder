/**
 * Enhanced error handling utilities
 */
export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly timestamp: string;
    constructor(message: string, code?: string, statusCode?: number, isOperational?: boolean);
    toJSON(): {
        name: string;
        message: string;
        code: string;
        statusCode: number;
        timestamp: string;
        stack: string | undefined;
    };
}
/**
 * Network-related errors
 */
export declare class NetworkError extends AppError {
    constructor(message?: string);
}
/**
 * Timeout errors
 */
export declare class TimeoutError extends AppError {
    constructor(message?: string);
}
/**
 * Validation errors
 */
export declare class ValidationError extends AppError {
    constructor(message: string, field?: string);
}
/**
 * Authentication errors
 */
export declare class AuthError extends AppError {
    constructor(message?: string);
}
/**
 * Authorization errors
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
/**
 * Not found errors
 */
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
/**
 * Converts unknown errors to AppError instances
 */
export declare const handleApiError: (error: unknown) => AppError;
/**
 * Error handler for async functions
 */
export declare const asyncErrorHandler: <T extends any[], R>(fn: (...args: T) => Promise<R>) => (...args: T) => Promise<R>;
/**
 * Retry wrapper with exponential backoff
 */
export declare const withRetry: <T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number, shouldRetry?: (error: AppError) => boolean) => Promise<T>;
/**
 * Type guard to check if error is operational
 */
export declare const isOperationalError: (error: Error) => boolean;
/**
 * Format error for user display
 */
export declare const formatErrorForUser: (error: unknown) => string;
/**
 * Error reporting utility (for external services)
 */
export declare const reportError: (error: AppError, context?: Record<string, any>) => void;
