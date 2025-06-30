import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Calendar, Users, BarChart3, Package, Settings, Eye, UserPlus, MapPin, CheckSquare, FileText, ListOrdered } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useSiteAssets } from '@/hooks/useSiteAssets';
export const AdminSidebar = ({ activeSection, onSectionChange }) => {
    const { profile, hasPermission, signOut } = useAuth();
    const { assets } = useSiteAssets();
    const [currentSection, setCurrentSection] = useState(activeSection || 'dashboard');
    const handleSectionChange = (section) => {
        setCurrentSection(section);
        onSectionChange?.(section);
    };
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3, permission: null },
        { id: 'bookings', label: 'Bookings', icon: Calendar, permission: 'BookingManagement' },
        { id: 'assignment', label: 'Assignments', icon: UserPlus, permission: 'BookingAssignment' },
        { id: 'customers', label: 'Customers', icon: Users, permission: 'BookingManagement' },
        { id: 'equipment', label: 'Equipment', icon: Package, permission: 'ProductManagement' },
        { id: 'categories', label: 'Category Order', icon: ListOrdered, permission: 'CategoryManagement' },
        { id: 'reports', label: 'Reports', icon: FileText, permission: 'ReportingAccess' }, // Added Reports
        { id: 'users', label: 'User Management', icon: Users, permission: 'UserManagement' },
        { id: 'visibility', label: 'Visibility Settings', icon: Eye, permission: 'VisibilitySettings' },
        { id: 'tasks', label: 'My Tasks', icon: MapPin, permission: 'DriverTasks' },
        { id: 'taskmaster', label: 'Task Management', icon: CheckSquare, permission: 'TaskMaster' },
        { id: 'settings', label: 'Settings', icon: Settings, permission: null },
    ];
    const visibleMenuItems = menuItems.filter(item => !item.permission || hasPermission(item.permission));
    return (_jsxs("div", { className: "w-64 bg-white border-r border-gray-200", children: [_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx("img", { src: assets.logo || '/placeholder.svg', alt: "Travel Light Aruba", className: "h-8 w-auto mr-3" }), _jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Admin Panel" })] }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: [profile?.name, " (", profile?.role, ")"] })] }), _jsx("nav", { className: "px-4 pb-4 space-y-2", children: visibleMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (_jsxs("button", { onClick: () => handleSectionChange(item.id), className: `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentSection === item.id
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:bg-gray-50'}`, children: [_jsx(Icon, { className: "h-5 w-5" }), _jsx("span", { className: "font-medium", children: item.label })] }, item.id));
                }) }), _jsx("div", { className: "absolute bottom-4 left-4 right-4", children: _jsx(Button, { onClick: signOut, variant: "outline", className: "w-full", children: "Sign Out" }) })] }));
};
