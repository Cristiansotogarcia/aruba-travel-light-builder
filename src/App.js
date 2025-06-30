import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteAssetsProvider } from "@/hooks/useSiteAssets";
import Index from "./pages/Index";
import Equipment from "./pages/Equipment";
import Book from "./pages/Book";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import DriverDashboard from "./pages/DriverDashboard"; // Import DriverDashboard
import CustomerDashboard from "./pages/CustomerDashboard"; // Import CustomerDashboard
import BookerDashboard from "./pages/BookerDashboard"; // Import BookerDashboard
import NotFound from "./pages/NotFound";
import ProtectedRoute from "@/components/layout/ProtectedRoute"; // Import ProtectedRoute
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
        },
    },
});
const App = () => (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(TooltipProvider, { children: _jsx(AuthProvider, { children: _jsxs(SiteAssetsProvider, { children: [_jsx(Toaster, {}), _jsx(Sonner, {}), _jsx(ErrorBoundary, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Index, {}) }), _jsx(Route, { path: "/equipment", element: _jsx(Equipment, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { element: _jsx(ProtectedRoute, { allowedRoles: ['Customer', 'Booker', 'Admin', 'SuperUser'] }), children: _jsx(Route, { path: "/book", element: _jsx(Book, {}) }) }), _jsx(Route, { element: _jsx(ProtectedRoute, { allowedRoles: ['Admin', 'SuperUser'] }), children: _jsx(Route, { path: "/admin", element: _jsx(Admin, {}) }) }), _jsx(Route, { element: _jsx(ProtectedRoute, { allowedRoles: ['Driver'] }), children: _jsx(Route, { path: "/driver-dashboard", element: _jsx(DriverDashboard, {}) }) }), _jsx(Route, { element: _jsx(ProtectedRoute, { allowedRoles: ['Customer'] }), children: _jsx(Route, { path: "/customer-dashboard", element: _jsx(CustomerDashboard, {}) }) }), _jsx(Route, { element: _jsx(ProtectedRoute, { allowedRoles: ['Booker', 'Admin', 'SuperUser'] }), children: _jsx(Route, { path: "/booker", element: _jsx(BookerDashboard, {}) }) }), _jsx(Route, { path: "/contact", element: _jsx(Contact, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }) })] }) }) }) }));
export default App;
