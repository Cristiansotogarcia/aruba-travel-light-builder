import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import MobileNav from './MobileNav';
export const Header = () => {
    const { user, profile, signOut, loading } = useAuth();
    const { assets } = useSiteAssets();
    const navigate = useNavigate();
    const handleSignOut = async () => {
        await signOut();
        navigate('/'); // Redirect to homepage after sign out
    };
    const getDashboardLink = () => {
        if (!profile)
            return null;
        switch (profile.role) {
            case 'Admin':
            case 'SuperUser':
                return { path: '/admin', label: 'Admin Dashboard' };
            case 'Driver':
                return { path: '/driver-dashboard', label: 'Driver Dashboard' };
            case 'Booker':
                return { path: '/customer-dashboard', label: 'My Dashboard' };
            default:
                return null;
        }
    };
    const dashboardLink = getDashboardLink();
    return (_jsx("header", { className: "bg-white shadow-sm sticky top-0 z-50", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between items-center h-16", children: [_jsx(Link, { to: "/", className: "flex items-center", children: _jsx("img", { src: assets.logo || '/placeholder.svg', alt: "Travel Light Aruba", className: "w-auto h-12 object-contain" }) }), _jsxs("nav", { className: "hidden md:flex items-center space-x-8", children: [_jsx(Link, { to: "/equipment", className: "text-gray-700 hover:text-blue-600 transition-colors", children: "Equipment" }), _jsx(Link, { to: "/about", className: "text-gray-700 hover:text-blue-600 transition-colors", children: "About" }), _jsx(Link, { to: "/contact", className: "text-gray-700 hover:text-blue-600 transition-colors", children: "Contact" })] }), _jsx("div", { className: "hidden md:flex items-center space-x-4", children: loading ? (_jsx("p", { children: "Loading..." })) : user && profile ? (_jsxs(_Fragment, { children: [profile.role === 'Booker' && (
                                // Hide Book Now button until booking is enabled
                                _jsx(Button, { asChild: true, className: "hidden", hidden: true, children: _jsx(Link, { to: "/book", children: "Book Now" }) })), dashboardLink && (_jsx(Button, { asChild: true, variant: "outline", children: _jsx(Link, { to: dashboardLink.path, children: dashboardLink.label }) })), _jsx(Button, { variant: "ghost", onClick: handleSignOut, children: "Logout" })] })) : (_jsx(_Fragment, { children: _jsx(Link, { to: "/login", children: _jsx(Button, { variant: "outline", children: "Login" }) }) })) }), _jsx("div", { className: "md:hidden", children: _jsx(MobileNav, {}) })] }) }) }));
};
