import {
  BarChart3,
  Calendar,
  CheckSquare,
  Clock,
  Eye,
  FileText,
  Info,
  ListOrdered,
  MapPin,
  Package,
  Search,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  permission: string | null;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
}

export const ADMIN_DASHBOARD_ITEM: AdminNavItem = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: BarChart3,
  permission: null,
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'administration',
    label: 'Administration',
    icon: Calendar,
    items: [
      { id: 'bookings', label: 'Bookings', icon: Calendar, permission: 'BookingManagement' },
      { id: 'pending-reservations', label: 'Pending Reservations', icon: Clock, permission: 'BookingManagement' },
      { id: 'invoices', label: 'Invoices', icon: FileText, permission: 'BookingManagement' },
      { id: 'customers', label: 'Customers', icon: Users, permission: 'BookingManagement' },
      { id: 'assignment', label: 'Assignments', icon: UserPlus, permission: 'BookingAssignment' },
      { id: 'reports', label: 'Analytics & Reports', icon: BarChart3, permission: 'ReportingAccess' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: Package,
    items: [
      { id: 'equipment', label: 'Equipment', icon: Package, permission: 'ProductManagement' },
      { id: 'categories', label: 'Categories & Order', icon: ListOrdered, permission: 'CategoryManagement' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: Info,
    items: [
      { id: 'about-us', label: 'About Us', icon: Info, permission: null },
      { id: 'seo', label: 'SEO Manager', icon: Search, permission: 'SeoManager' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: CheckSquare,
    items: [
      { id: 'tasks', label: 'My Tasks', icon: MapPin, permission: 'DriverTasks' },
      { id: 'taskmaster', label: 'Task Management', icon: CheckSquare, permission: 'TaskMaster' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: Settings,
    items: [
      { id: 'users', label: 'User Management', icon: Users, permission: 'UserManagement' },
      { id: 'visibility', label: 'Visibility Settings', icon: Eye, permission: 'VisibilitySettings' },
      { id: 'settings', label: 'Settings', icon: Settings, permission: 'settings' },
    ],
  },
];

const hasAccessToItem = (
  item: AdminNavItem,
  hasPermission: (componentName: string) => boolean,
) => !item.permission || hasPermission(item.permission);

export const getVisibleAdminNavigation = (hasPermission: (componentName: string) => boolean) => ({
  dashboard: ADMIN_DASHBOARD_ITEM,
  groups: ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasAccessToItem(item, hasPermission)),
  })).filter((group) => group.items.length > 0),
});

export const getAdminGroupIdForSection = (section: string) =>
  ADMIN_NAV_GROUPS.find((group) => group.items.some((item) => item.id === section))?.id ?? null;

export const getAdminSectionLabel = (section: string) => {
  if (section === ADMIN_DASHBOARD_ITEM.id) {
    return ADMIN_DASHBOARD_ITEM.label;
  }

  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find((entry) => entry.id === section);
    if (item) {
      return item.label;
    }
  }

  return ADMIN_DASHBOARD_ITEM.label;
};

export const getDefaultAdminGroupState = (activeSection: string) => {
  const activeGroupId = getAdminGroupIdForSection(activeSection);

  return ADMIN_NAV_GROUPS.reduce<Record<string, boolean>>((state, group) => {
    state[group.id] = group.id === 'administration' || group.id === activeGroupId;
    return state;
  }, {});
};
