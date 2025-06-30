import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Enhanced Error Boundary component with detailed error reporting and recovery
 */
import React, { Component } from 'react';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        Object.defineProperty(this, "resetTimeoutId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "previousResetKeys", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "resetErrorBoundary", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                if (this.resetTimeoutId) {
                    clearTimeout(this.resetTimeoutId);
                }
                this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                    errorId: null,
                    retryCount: 0
                });
                console.info('Error boundary reset');
            }
        });
        Object.defineProperty(this, "retryWithDelay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (delay = 1000) => {
                this.resetTimeoutId = window.setTimeout(() => {
                    this.resetErrorBoundary();
                }, delay);
            }
        });
        Object.defineProperty(this, "reportError", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: async (error, errorInfo, details) => {
                try {
                    // Here you would typically send to an error reporting service
                    // like Sentry, Bugsnag, or your own error tracking endpoint
                    // Example: Send to your API
                    // await fetch('/api/errors', {
                    //   method: 'POST',
                    //   headers: { 'Content-Type': 'application/json' },
                    //   body: JSON.stringify(details)
                    // });
                    console.info('Error reported to tracking service', { errorId: this.state.errorId });
                }
                catch (reportingError) {
                    console.error('Failed to report error to tracking service', reportingError);
                }
            }
        });
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
            retryCount: 0
        };
        this.previousResetKeys = props.resetKeys || [];
    }
    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    }
    componentDidCatch(error, errorInfo) {
        const { onError, isolate } = this.props;
        // Log the error with detailed information
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            errorBoundary: this.constructor.name,
            props: this.props,
            state: this.state,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        console.error('React Error Boundary caught an error', errorDetails);
        // Update state with error info
        this.setState({
            errorInfo,
            retryCount: this.state.retryCount + 1
        });
        // Call custom error handler
        if (onError) {
            try {
                onError(error, errorInfo);
            }
            catch (handlerError) {
                console.error('Error in custom error handler', handlerError);
            }
        }
        // Report to external error tracking service
        this.reportError(error, errorInfo, errorDetails);
        // If not isolated, re-throw to parent boundary
        if (!isolate && this.state.retryCount >= (this.props.maxRetries || 3)) {
            throw error;
        }
    }
    componentDidUpdate(prevProps) {
        const { resetKeys, resetOnPropsChange } = this.props;
        const { hasError } = this.state;
        // Reset error state if resetKeys have changed
        if (hasError && resetKeys) {
            const hasResetKeyChanged = resetKeys.some((key, index) => key !== this.previousResetKeys[index]);
            if (hasResetKeyChanged) {
                this.previousResetKeys = resetKeys;
                this.resetErrorBoundary();
            }
        }
        // Reset on any prop change if enabled
        if (hasError && resetOnPropsChange && prevProps !== this.props) {
            this.resetErrorBoundary();
        }
    }
    componentWillUnmount() {
        if (this.resetTimeoutId) {
            clearTimeout(this.resetTimeoutId);
        }
    }
    render() {
        const { hasError, error, errorInfo, retryCount } = this.state;
        const { children, fallback, maxRetries = 3 } = this.props;
        if (hasError && error && errorInfo) {
            // Use custom fallback if provided
            if (fallback) {
                return fallback(error, errorInfo, this.resetErrorBoundary);
            }
            // Default fallback UI
            return (_jsx(DefaultErrorFallback, { error: error, errorInfo: errorInfo, retryCount: retryCount, maxRetries: maxRetries, onRetry: this.resetErrorBoundary, onRetryWithDelay: () => this.retryWithDelay(2000) }));
        }
        return children;
    }
}
const DefaultErrorFallback = ({ error, errorInfo, retryCount, maxRetries, onRetry, onRetryWithDelay }) => {
    const [showDetails, setShowDetails] = React.useState(false);
    const [copied, setCopied] = React.useState(false);
    const copyErrorDetails = async () => {
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString()
        };
        try {
            await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch (err) {
            console.error('Failed to copy error details', err);
        }
    };
    const canRetry = retryCount < maxRetries;
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "mx-auto h-12 w-12 text-red-500", children: _jsx("svg", { fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" }) }) }), _jsx("h2", { className: "mt-6 text-3xl font-extrabold text-gray-900", children: "Something went wrong" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: "We're sorry, but something unexpected happened. Our team has been notified." })] }), _jsxs("div", { className: "mt-8 space-y-4", children: [canRetry && (_jsxs("div", { className: "flex space-x-3", children: [_jsx("button", { onClick: onRetry, className: "flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors", children: "Try Again" }), _jsx("button", { onClick: onRetryWithDelay, className: "flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors", children: "Retry in 2s" })] })), _jsx("button", { onClick: () => window.location.reload(), className: "w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors", children: "Reload Page" }), _jsxs("button", { onClick: () => setShowDetails(!showDetails), className: "w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors", children: [showDetails ? 'Hide' : 'Show', " Error Details"] }), showDetails && (_jsxs("div", { className: "mt-4 p-4 bg-gray-100 rounded-md", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("h3", { className: "text-sm font-medium text-gray-900", children: "Error Details" }), _jsx("button", { onClick: copyErrorDetails, className: "text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors", children: copied ? 'Copied!' : 'Copy' })] }), _jsxs("div", { className: "text-xs text-gray-700 space-y-2", children: [_jsxs("div", { children: [_jsx("strong", { children: "Error:" }), " ", error.message] }), _jsxs("div", { children: [_jsx("strong", { children: "Retry Count:" }), " ", retryCount, "/", maxRetries] }), error.stack && (_jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "cursor-pointer font-medium", children: "Stack Trace" }), _jsx("pre", { className: "mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32", children: error.stack })] })), errorInfo.componentStack && (_jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "cursor-pointer font-medium", children: "Component Stack" }), _jsx("pre", { className: "mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32", children: errorInfo.componentStack })] }))] })] })), !canRetry && (_jsx("div", { className: "mt-4 p-3 bg-red-50 border border-red-200 rounded-md", children: _jsx("p", { className: "text-sm text-red-800", children: "Maximum retry attempts reached. Please reload the page or contact support if the problem persists." }) }))] })] }) }));
};
/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary(Component, errorBoundaryProps) {
    const WrappedComponent = (props) => (_jsx(ErrorBoundary, { ...errorBoundaryProps, children: _jsx(Component, { ...props }) }));
    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
    return WrappedComponent;
}
/**
 * Hook for error boundary functionality in functional components
 */
export function useErrorHandler() {
    return React.useCallback((error, errorInfo) => {
        // This will be caught by the nearest error boundary
        throw error;
    }, []);
}
/**
 * Async error boundary for handling promise rejections
 */
export class AsyncErrorBoundary extends Component {
    constructor(props) {
        super(props);
        Object.defineProperty(this, "handlePromiseRejection", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (event) => {
                const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
                console.error('Unhandled promise rejection caught by AsyncErrorBoundary', {
                    reason: event.reason,
                    promise: event.promise
                });
                this.setState({
                    hasError: true,
                    error,
                    errorInfo: { componentStack: 'Promise rejection' },
                    errorId: `async_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    retryCount: this.state.retryCount + 1
                });
                // Prevent the default browser behavior
                event.preventDefault();
            }
        });
        Object.defineProperty(this, "resetErrorBoundary", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                    errorId: null,
                    retryCount: 0
                });
            }
        });
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
            retryCount: 0
        };
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', this.handlePromiseRejection);
    }
    componentWillUnmount() {
        window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error('AsyncErrorBoundary caught an error', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
        });
        this.setState({ errorInfo });
    }
    render() {
        const { hasError, error, errorInfo } = this.state;
        const { children, fallback } = this.props;
        if (hasError && error && errorInfo) {
            if (fallback) {
                return fallback(error, errorInfo, this.resetErrorBoundary);
            }
            return (_jsx(DefaultErrorFallback, { error: error, errorInfo: errorInfo, retryCount: this.state.retryCount, maxRetries: this.props.maxRetries || 3, onRetry: this.resetErrorBoundary, onRetryWithDelay: () => {
                    setTimeout(this.resetErrorBoundary, 2000);
                } }));
        }
        return children;
    }
}
export default ErrorBoundary;
