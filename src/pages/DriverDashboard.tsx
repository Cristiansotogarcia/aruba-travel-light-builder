import { DashboardLayout } from '@/components/admin/DashboardLayout';
import { DriverTasks } from '@/components/admin/DriverTasks';
import { DriverTopBar } from '@/components/driver/DriverTopBar';

const DriverDashboard = () => {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50">
        <DriverTopBar />

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <DriverTasks
            scope="current-user"
            requiredPermission="DriverTasks"
            title="Driver Dashboard"
            description="Manage today's deliveries and upcoming pickups"
          />
        </main>
      </div>
    </DashboardLayout>
  );
};

export default DriverDashboard;
