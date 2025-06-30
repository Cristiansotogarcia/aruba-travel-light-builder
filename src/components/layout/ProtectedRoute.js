import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
const ProtectedRoute = ({ allowedRoles, children }) => {
    const { user, profile, loading } = useAuth();
    if (loading) {
        // You might want to show a loading spinner here
        return _jsx("div", { className: "min-h-screen flex flex-col items-center justify-center", children: _jsx("p", { children: "Loading..." }) });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // User is logged in but does not have the required role
        // Redirect to a generic dashboard or an unauthorized page
        // For simplicity, redirecting to home. Consider an '/unauthorized' page.
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return children ? _jsx(_Fragment, { children: children }) : _jsx(Outlet, {});
};
export default ProtectedRoute;
