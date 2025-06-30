/**
 * Enhanced Error Boundary component with detailed error reporting and recovery
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
export interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorId: string | null;
    retryCount: number;
}
export interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    maxRetries?: number;
    resetOnPropsChange?: boolean;
    resetKeys?: Array<string | number>;
    isolate?: boolean;
}
export declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    private resetTimeoutId;
    private previousResetKeys;
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    componentDidUpdate(prevProps: ErrorBoundaryProps): void;
    componentWillUnmount(): void;
    resetErrorBoundary: () => void;
    retryWithDelay: (delay?: number) => void;
    private reportError;
    render(): string | number | boolean | import("react/jsx-runtime").JSX.Element | Iterable<React.ReactNode> | null | undefined;
}
/**
 * Higher-order component for wrapping components with error boundary
 */
export declare function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>): {
    (props: P): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
/**
 * Hook for error boundary functionality in functional components
 */
export declare function useErrorHandler(): (error: Error, errorInfo?: ErrorInfo) => never;
/**
 * Async error boundary for handling promise rejections
 */
export declare class AsyncErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    componentWillUnmount(): void;
    handlePromiseRejection: (event: PromiseRejectionEvent) => void;
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    resetErrorBoundary: () => void;
    render(): string | number | boolean | import("react/jsx-runtime").JSX.Element | Iterable<React.ReactNode> | null | undefined;
}
export default ErrorBoundary;
