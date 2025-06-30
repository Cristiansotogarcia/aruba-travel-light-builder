import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { DashboardLayout } from '@/components/admin/DashboardLayout';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { BookingsList } from '@/components/admin/BookingsList';
import { CustomersList } from '@/components/admin/CustomersList';
import { UserManagement } from '@/components/admin/UserManagement';
import { VisibilitySettings } from '@/components/admin/VisibilitySettings';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { BookingAssignment } from '@/components/admin/BookingAssignment';
import { DriverTasks } from '@/components/admin/DriverTasks';
import { ReportsDashboard } from '@/components/admin/ReportsDashboard'; // Import ReportsDashboard
import { SiteSettings } from '@/components/admin/SiteSettings';
const Admin = () => {
    const [activeSection, setActiveSection] = useState('dashboard');
    const renderActiveSection = () => {
        switch (activeSection) {
            case 'dashboard':
                return _jsx(AdminDashboard, {});
            case 'bookings':
                return _jsx(BookingsList, {});
            case 'customers':
                return _jsx(CustomersList, {});
            case 'assignment':
                return _jsx(BookingAssignment, {});
            case 'equipment':
                return _jsx(ProductManagement, {});
            case 'categories':
                return _jsx(CategoryManagement, {});
            case 'reports': // Add case for reports
                return _jsx(ReportsDashboard, {});
            case 'users':
                return _jsx(UserManagement, {});
            case 'visibility':
                return _jsx(VisibilitySettings, {});
            case 'tasks':
                return _jsx(DriverTasks, {});
            case 'settings':
                return _jsx(SiteSettings, {});
            default:
                return _jsx(AdminDashboard, {});
        }
    };
    return (_jsx(DashboardLayout, { children: _jsxs("div", { className: "min-h-screen flex w-full", children: [_jsx(AdminSidebar, { activeSection: activeSection, onSectionChange: setActiveSection }), _jsx("main", { className: "flex-1 p-6 bg-gray-50", children: renderActiveSection() })] }) }));
};
export default Admin;
