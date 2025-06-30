import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
const MobileNav = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, profile, signOut, loading } = useAuth();
    const navigate = useNavigate();
    const handleSignOut = async () => {
        await signOut();
        setIsOpen(false);
        navigate('/');
    };
    const NavLink = ({ to, children }) => (_jsx(Link, { to: to, onClick: () => setIsOpen(false), className: "block px-3 py-2 text-gray-700 hover:text-blue-600", children: children }));
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
    return (_jsxs(Sheet, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(SheetTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: "icon", className: "md:hidden", children: [_jsx(Menu, { className: "h-6 w-6" }), _jsx("span", { className: "sr-only", children: "Open menu" })] }) }), _jsxs(SheetContent, { side: "left", children: [_jsxs("div", { className: "flex justify-between items-center p-4 border-b", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Menu" }), _jsxs(Button, { variant: "ghost", size: "icon", onClick: () => setIsOpen(false), children: [_jsx(X, { className: "h-6 w-6" }), _jsx("span", { className: "sr-only", children: "Close menu" })] })] }), _jsxs("nav", { className: "py-4", children: [_jsx(NavLink, { to: "/equipment", children: "Equipment" }), _jsx(NavLink, { to: "/about", children: "About" }), _jsx(NavLink, { to: "/contact", children: "Contact" }), _jsx("div", { className: "mt-4 pt-4 border-t", children: loading ? (_jsx("p", { className: "px-3 py-2 text-gray-700", children: "Loading..." })) : user && profile ? (_jsxs("div", { className: "space-y-2", children: [profile.role === 'Booker' && (
                                        // Hide Book Now option for now
                                        _jsx(Button, { asChild: true, className: "w-full hidden", hidden: true, onClick: () => setIsOpen(false), children: _jsx(Link, { to: "/book", children: "Book Now" }) })), dashboardLink && (_jsx(Button, { asChild: true, variant: "outline", className: "w-full", onClick: () => setIsOpen(false), children: _jsx(Link, { to: dashboardLink.path, children: dashboardLink.label }) })), _jsx(Button, { variant: "ghost", className: "w-full justify-start", onClick: handleSignOut, children: "Logout" })] })) : (_jsx(Button, { asChild: true, variant: "outline", className: "w-full", onClick: () => setIsOpen(false), children: _jsx(Link, { to: "/login", children: "Login" }) })) })] })] })] }));
};
export default MobileNav;
