/**
 * Enhanced error handling utilities
 */
export class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, isOperational = true) {
        super(message);
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "statusCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "isOperational", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "timestamp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, AppError);
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}
/**
 * Network-related errors
 */
export class NetworkError extends AppError {
    constructor(message = 'Network request failed') {
        super(message, 'NETWORK_ERROR', 0);
    }
}
/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
    constructor(message = 'Request timed out') {
        super(message, 'TIMEOUT_ERROR', 408);
    }
}
/**
 * Validation errors
 */
export class ValidationError extends AppError {
    constructor(message, field) {
        super(message, 'VALIDATION_ERROR', 400);
        if (field) {
            this.message = `${field}: ${message}`;
        }
    }
}
/**
 * Authentication errors
 */
export class AuthError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 'AUTH_ERROR', 401);
    }
}
/**
 * Authorization errors
 */
export class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 'AUTHORIZATION_ERROR', 403);
    }
}
/**
 * Not found errors
 */
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 'NOT_FOUND_ERROR', 404);
    }
}
/**
 * Converts unknown errors to AppError instances
 */
export const handleApiError = (error) => {
    // Already an AppError
    if (error instanceof AppError) {
        return error;
    }
    // Standard Error
    if (error instanceof Error) {
        // Check for specific error types
        if (error.name === 'AbortError') {
            return new TimeoutError('Request was aborted');
        }
        if (error.message.includes('fetch')) {
            return new NetworkError(error.message);
        }
        return new AppError(error.message, 'UNKNOWN_ERROR');
    }
    // String error
    if (typeof error === 'string') {
        return new AppError(error, 'STRING_ERROR');
    }
    // Object with message
    if (error && typeof error === 'object' && 'message' in error) {
        return new AppError(String(error.message), 'OBJECT_ERROR');
    }
    // Fallback for unknown error types
    return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR');
};
/**
 * Error handler for async functions
 */
export const asyncErrorHandler = (fn) => {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            throw handleApiError(error);
        }
    };
};
/**
 * Retry wrapper with exponential backoff
 */
export const withRetry = async (fn, maxRetries = 3, baseDelay = 1000, shouldRetry = () => true) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = handleApiError(error);
            if (attempt === maxRetries || !shouldRetry(lastError)) {
                throw lastError;
            }
            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
};
/**
 * Type guard to check if error is operational
 */
export const isOperationalError = (error) => {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
};
/**
 * Format error for user display
 */
export const formatErrorForUser = (error) => {
    const appError = handleApiError(error);
    // Don't expose internal errors to users
    if (!appError.isOperational) {
        return 'An unexpected error occurred. Please try again later.';
    }
    switch (appError.code) {
        case 'VALIDATION_ERROR':
            return appError.message;
        case 'NETWORK_ERROR':
            return 'Network connection failed. Please check your internet connection.';
        case 'TIMEOUT_ERROR':
            return 'Request timed out. Please try again.';
        case 'AUTH_ERROR':
            return 'Authentication failed. Please log in again.';
        case 'AUTHORIZATION_ERROR':
            return 'You do not have permission to perform this action.';
        case 'NOT_FOUND_ERROR':
            return appError.message;
        default:
            return appError.message || 'An error occurred. Please try again.';
    }
};
/**
 * Error reporting utility (for external services)
 */
export const reportError = (error, context) => {
    // Only report non-operational errors or critical errors
    if (!error.isOperational || error.statusCode >= 500) {
        console.error('Error reported:', {
            error: error.toJSON(),
            context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
        // In production, send to external error reporting service
        if (import.meta.env.PROD) {
            // Example: Sentry, LogRocket, etc.
            // Sentry.captureException(error, { extra: context });
        }
    }
};
