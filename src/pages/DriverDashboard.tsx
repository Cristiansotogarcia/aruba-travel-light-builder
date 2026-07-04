import { Truck } from 'lucide-react';

import { DriverTasks } from '@/components/admin/DriverTasks';
import { AppShell, type AppNavEntry } from '@/components/layout/app-shell';

const DRIVER_NAV: AppNavEntry[] = [
  { id: 'tasks', label: 'My Deliveries', icon: Truck },
];

const DriverDashboard = () => {
  return (
    <AppShell
      panelName="Driver Workspace"
      nav={DRIVER_NAV}
      activeSection="tasks"
      onSectionChange={() => {}}
      contentClassName="max-w-3xl"
    >
      <DriverTasks
        scope="current-user"
        requiredPermission="DriverTasks"
        title="Driver Dashboard"
        description="Manage today's deliveries and upcoming pickups"
      />
    </AppShell>
  );
};

export default DriverDashboard;
