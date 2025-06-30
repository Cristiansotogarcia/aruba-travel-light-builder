import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(_) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsxs("div", { style: { padding: '20px', textAlign: 'center', backgroundColor: '#fff3f3', border: '1px solid #fcc', color: '#cc0000' }, children: [_jsx("h2", { children: "Something went wrong." }), _jsx("p", { children: "We're sorry for the inconvenience. Please try refreshing the page or contact support if the problem persists." })] }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
