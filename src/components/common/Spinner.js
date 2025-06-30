import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Spinner = ({ size = 'md', color = 'text-primary', message, className = '', }) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-4',
        lg: 'w-12 h-12 border-4',
    };
    return (_jsxs("div", { className: `flex flex-col items-center justify-center ${className}`, children: [_jsx("div", { className: `animate-spin rounded-full ${sizeClasses[size]} ${color} border-t-transparent`, style: { borderTopColor: 'transparent' } }), message && _jsx("p", { className: `mt-2 text-sm ${color}`, children: message })] }));
};
export default Spinner;
