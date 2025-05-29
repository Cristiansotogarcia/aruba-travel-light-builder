
import { useState } from 'react';
import { DashboardLayout } from '@/components/admin/DashboardLayout';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { BookingsList } from '@/components/admin/BookingsList';
import { CustomersList } from '@/components/admin/CustomersList';

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
        return <div className="text-center py-12"><p className="text-gray-500">Booking Assignment coming soon...</p></div>;
      case 'equipment':
        return <div className="text-center py-12"><p className="text-gray-500">Equipment Management coming soon...</p></div>;
      case 'users':
        return <div className="text-center py-12"><p className="text-gray-500">User Management coming soon...</p></div>;
      case 'visibility':
        return <div className="text-center py-12"><p className="text-gray-500">Visibility Settings coming soon...</p></div>;
      case 'tasks':
        return <div className="text-center py-12"><p className="text-gray-500">Driver Tasks coming soon...</p></div>;
      case 'settings':
        return <div className="text-center py-12"><p className="text-gray-500">Settings coming soon...</p></div>;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex-1 flex">
        <div className="flex-1">
          {renderActiveSection()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
