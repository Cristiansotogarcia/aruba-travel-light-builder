import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
export const DashboardLayout = ({ children }) => {
    const { user, profile, loading } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        if (!loading && !user) {
            console.log('No user found, redirecting to login');
            navigate('/login');
        }
    }, [user, loading, navigate]);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" }) }));
    }
    if (!user) {
        return null;
    }
    if (!profile) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-red-600 mb-4", children: _jsx("svg", { className: "h-16 w-16 mx-auto mb-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" }) }) }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "Profile Not Found" }), _jsx("p", { className: "text-gray-600 mb-4", children: "Your user profile could not be loaded. This may be because your account hasn't been properly set up yet." }), _jsx("button", { onClick: () => navigate('/login'), className: "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700", children: "Back to Login" })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen flex flex-col", children: _jsx("div", { className: "flex-1", children: children }) }));
};
