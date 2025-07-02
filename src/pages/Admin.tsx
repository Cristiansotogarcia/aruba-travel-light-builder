
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
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { SiteSettings } from '@/components/admin/SiteSettings';
import { SeoManager } from '@/components/admin/SeoManager';

const Admin = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'bookings':
        return <BookingsList />;
      case 'customers':
        return <CustomersList />;
      case 'assignment':
        return <BookingAssignment />;
      case 'equipment':
        return <ProductManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'reports': // Add case for reports
        return <ReportsDashboard />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'users':
        return <UserManagement />;
      case 'visibility':
        return <VisibilitySettings />;
      case 'tasks':
        return <DriverTasks />;
      case 'seo':
        return <SeoManager slug="home" />;
      case 'settings':
        return <SiteSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen flex w-full">
        <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 p-6 bg-gray-50">
          {renderActiveSection()}
        </main>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
