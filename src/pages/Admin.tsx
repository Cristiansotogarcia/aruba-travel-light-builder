
import { useState } from 'react';
import { DashboardLayout } from '@/components/admin/DashboardLayout';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { BookingsList } from '@/components/admin/BookingsList';
import { CustomersList } from '@/components/admin/CustomersList';
import { UserManagement } from '@/components/admin/UserManagement';
import { VisibilitySettings } from '@/components/admin/VisibilitySettings';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { BookingAssignment } from '@/components/admin/BookingAssignment';
import { DriverTasks } from '@/components/admin/DriverTasks';

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
      case 'users':
        return <UserManagement />;
      case 'visibility':
        return <VisibilitySettings />;
      case 'tasks':
        return <DriverTasks />;
      case 'settings':
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Settings coming soon...</p>
          </div>
        );
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="flex-1 p-6 bg-gray-50">
        {renderActiveSection()}
      </main>
    </div>
  );
};

export default Admin;
