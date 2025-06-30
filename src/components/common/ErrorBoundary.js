import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        Object.defineProperty(this, "handleReset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                this.setState({ hasError: false, error: undefined, errorInfo: undefined });
            }
        });
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-4 bg-gray-50", children: _jsxs(Card, { className: "w-full max-w-lg", children: [_jsxs(CardHeader, { className: "text-center", children: [_jsx("div", { className: "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100", children: _jsx(AlertTriangle, { className: "h-6 w-6 text-red-600" }) }), _jsx(CardTitle, { className: "text-xl font-semibold text-gray-900", children: "Something went wrong" }), _jsx(CardDescription, { className: "text-gray-600", children: "We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists." })] }), _jsxs(CardContent, { className: "space-y-4", children: [process.env.NODE_ENV === 'development' && this.state.error && (_jsxs("details", { className: "text-sm", children: [_jsx("summary", { className: "cursor-pointer font-medium text-gray-700 hover:text-gray-900", children: "Error Details (Development)" }), _jsxs("div", { className: "mt-2 p-3 bg-gray-100 rounded border text-xs font-mono", children: [_jsxs("div", { className: "font-semibold text-red-600 mb-1", children: [this.state.error.name, ": ", this.state.error.message] }), _jsx("pre", { className: "whitespace-pre-wrap text-gray-700", children: this.state.error.stack }), this.state.errorInfo && (_jsxs("div", { className: "mt-2 pt-2 border-t border-gray-300", children: [_jsx("div", { className: "font-semibold text-gray-600 mb-1", children: "Component Stack:" }), _jsx("pre", { className: "whitespace-pre-wrap text-gray-600", children: this.state.errorInfo.componentStack })] }))] })] })), _jsxs("div", { className: "flex gap-2 justify-center", children: [_jsxs(Button, { onClick: this.handleReset, className: "flex items-center gap-2", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), "Try Again"] }), _jsx(Button, { variant: "outline", onClick: () => window.location.reload(), children: "Refresh Page" })] })] })] }) }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
