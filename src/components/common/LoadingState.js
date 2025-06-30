import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Spinner from './Spinner';
/**
 * A standardized component for handling loading states throughout the application.
 * Can be used as a wrapper around any content that might be in a loading state.
 */
const LoadingState = ({ isLoading, children, message = 'Loading...', spinnerSize = 'md', className = '', minHeight = '200px', overlay = false, }) => {
    if (isLoading && !overlay) {
        return (_jsx("div", { className: `flex items-center justify-center ${className}`, style: { minHeight }, children: _jsx(Spinner, { size: spinnerSize, message: message }) }));
    }
    if (isLoading && overlay) {
        return (_jsxs("div", { className: "relative", children: [_jsx("div", { className: "opacity-50", children: children }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm", children: _jsx(Spinner, { size: spinnerSize, message: message }) })] }));
    }
    return _jsx(_Fragment, { children: children });
};
export default LoadingState;
