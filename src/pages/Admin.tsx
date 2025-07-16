import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/admin/DashboardLayout';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { BookingsList } from '@/components/admin/BookingsList';
import { CustomersList } from '@/components/admin/CustomersList';
import { UserManagement } from '@/components/admin/UserManagement';
import { VisibilitySettings } from '@/components/admin/VisibilitySettings';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { UnifiedCategoryOrderManager } from '@/components/admin/UnifiedCategoryOrderManager';
import { BookingAssignment } from '@/components/admin/BookingAssignment';
import { DriverTasks } from '@/components/admin/DriverTasks';
import { EnhancedReportsDashboard } from '@/components/admin/EnhancedReportsDashboard';
import { SiteSettings } from '@/components/admin/SiteSettings';
import { SeoManager } from '@/components/admin/SeoManager';
import AboutUsManagement from '@/components/admin/AboutUsManagement';

const Admin = () => {
  const [activeSection, setActiveSection] = useState(() => {
    // Initialize from sessionStorage if available
    const savedSection = sessionStorage.getItem('admin:activeSection');
    return savedSection || 'dashboard';
  });

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    sessionStorage.setItem('admin:activeSection', section);
  };

  useEffect(() => {
    // Save current section to sessionStorage whenever it changes
    sessionStorage.setItem('admin:activeSection', activeSection);
  }, [activeSection]);

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
        return <UnifiedCategoryOrderManager />;
      case 'about-us':
        return <AboutUsManagement />;
      case 'reports':
        return <EnhancedReportsDashboard />;
      case 'users':
        return <UserManagement />;
      case 'visibility':
        return <VisibilitySettings />;
      case 'tasks':
        return <DriverTasks />;
      case 'taskmaster':
        return <DriverTasks />;
      case 'seo':
        return <SeoManager />;
      case 'settings':
        return <SiteSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen flex w-full">
        <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        <main className="flex-1 p-6 bg-gray-50">
          {renderActiveSection()}
        </main>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
