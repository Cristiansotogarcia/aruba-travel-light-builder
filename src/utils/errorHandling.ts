/**
 * Enhanced error handling utilities
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
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
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR', 0);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
  constructor(message: string = 'Request timed out') {
    super(message, 'TIMEOUT_ERROR', 408);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
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
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404);
  }
}

/**
 * Converts unknown errors to AppError instances
 */
export const handleApiError = (error: unknown): AppError => {
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
    const message = (error as { message?: unknown }).message;
    return new AppError(String(message ?? 'Unknown error'), 'OBJECT_ERROR');
  }

  // Fallback for unknown error types
  return new AppError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR'
  );
};

/**
 * Error handler for async functions
 */
export const asyncErrorHandler = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleApiError(error);
    }
  };
};

/**
 * Retry wrapper with exponential backoff
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  shouldRetry: (error: AppError) => boolean = () => true
): Promise<T> => {
  let lastError: AppError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = handleApiError(error);

      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

/**
 * Type guard to check if error is operational
 */
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Format error for user display
 */
export const formatErrorForUser = (error: unknown): string => {
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
export const reportError = (error: AppError, context?: Record<string, unknown>) => {
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
