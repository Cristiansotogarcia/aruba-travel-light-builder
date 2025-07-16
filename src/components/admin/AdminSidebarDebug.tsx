import { useState, useEffect } from 'react';
import { Calendar, Users, BarChart3, Package, Settings, Eye, UserPlus, MapPin, CheckSquare, ListOrdered, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useSiteAssets } from '@/hooks/useSiteAssets';

interface AdminSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export const AdminSidebarDebug = ({ activeSection, onSectionChange }: AdminSidebarProps) => {
  const { profile, hasPermission, signOut } = useAuth();
  const { assets } = useSiteAssets();
  const [currentSection, setCurrentSection] = useState(activeSection || 'dashboard');

  // Debug logging
  useEffect(() => {
    console.log('=== AdminSidebar Debug Info ===');
    console.log('Profile:', profile);
    console.log('Profile Role:', profile?.role);
    console.log('SeoManager Permission:', hasPermission('SeoManager'));
    console.log('ReportingAccess Permission:', hasPermission('ReportingAccess'));
    console.log('BookingManagement Permission:', hasPermission('BookingManagement'));
    console.log('================================');
  }, [profile, hasPermission]);

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    onSectionChange?.(section);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, permission: null },
    { id: 'seo', label: 'SEO Manager', icon: Search, permission: 'SeoManager' },
    { id: 'bookings', label: 'Bookings', icon: Calendar, permission: 'BookingManagement' },
    { id: 'assignment', label: 'Assignments', icon: UserPlus, permission: 'BookingAssignment' },
    { id: 'customers', label: 'Customers', icon: Users, permission: 'BookingManagement' },
    { id: 'equipment', label: 'Equipment', icon: Package, permission: 'ProductManagement' },
    { id: 'categories', label: 'Category Order', icon: ListOrdered, permission: 'CategoryManagement' },
    { id: 'reports', label: 'Reports', icon: BarChart3, permission: 'ReportingAccess' },
    { id: 'users', label: 'User Management', icon: Users, permission: 'UserManagement' },
    { id: 'visibility', label: 'Visibility Settings', icon: Eye, permission: 'VisibilitySettings' },
    { id: 'tasks', label: 'My Tasks', icon: MapPin, permission: 'DriverTasks' },
    { id: 'taskmaster', label: 'Task Management', icon: CheckSquare, permission: 'TaskMaster' },
    { id: 'settings', label: 'Settings', icon: Settings, permission: 'settings' },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    const hasAccess = !item.permission || hasPermission(item.permission);
    console.log(`Menu item ${item.label} (${item.permission}): ${hasAccess}`);
    return hasAccess;
  });

  console.log('Visible menu items:', visibleMenuItems.map(item => item.label));

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <img
            src={assets.logo || '/placeholder.svg'}
            alt="Travel Light Aruba"
            className="h-8 w-auto mr-3"
          />
          <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {profile?.name} ({profile?.role})
        </p>
        {/* Debug info */}
        <div className="mt-2 p-2 bg-yellow-100 text-xs">
          <div>Role: {profile?.role}</div>
          <div>SEO: {hasPermission('SeoManager') ? 'YES' : 'NO'}</div>
          <div>Items: {visibleMenuItems.length}</div>
        </div>
      </div>
      <nav className="px-4 pb-4 space-y-2 flex-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentSection === item.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <Button 
          onClick={signOut} 
          variant="outline" 
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
};
