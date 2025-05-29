
import { useState } from 'react';
import { Calendar, Users, BarChart3, Package, Settings, Eye, UserPlus, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export const AdminSidebar = ({ activeSection, onSectionChange }: AdminSidebarProps) => {
  const { profile, hasPermission, signOut } = useAuth();
  const [currentSection, setCurrentSection] = useState(activeSection || 'dashboard');

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    onSectionChange?.(section);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, permission: null },
    { id: 'bookings', label: 'Bookings', icon: Calendar, permission: 'BookingManagement' },
    { id: 'assignment', label: 'Assignments', icon: UserPlus, permission: 'BookingAssignment' },
    { id: 'customers', label: 'Customers', icon: Users, permission: 'BookingManagement' },
    { id: 'equipment', label: 'Equipment', icon: Package, permission: 'ProductManagement' },
    { id: 'users', label: 'User Management', icon: Users, permission: 'UserManagement' },
    { id: 'visibility', label: 'Visibility Settings', icon: Eye, permission: 'VisibilitySettings' },
    { id: 'tasks', label: 'My Tasks', icon: MapPin, permission: 'DriverTasks' },
    { id: 'settings', label: 'Settings', icon: Settings, permission: null },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
        <p className="text-sm text-gray-600 mt-1">
          {profile?.name} ({profile?.role})
        </p>
      </div>
      <nav className="px-4 pb-4 space-y-2">
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
      <div className="absolute bottom-4 left-4 right-4">
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
