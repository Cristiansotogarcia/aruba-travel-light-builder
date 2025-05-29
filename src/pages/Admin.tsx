
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { BookingsList } from '@/components/admin/BookingsList';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
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
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <AdminSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />
        <main className="flex-1 p-6 bg-gray-50">
          {renderActiveSection()}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Admin;
