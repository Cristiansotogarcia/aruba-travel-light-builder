import { Header } from '@/components/layout/Header';
import { DriverTasks } from '@/components/admin/DriverTasks';

const DriverDashboard = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <DriverTasks
          scope="current-user"
          requiredPermission="DriverTasks"
          title="Driver Dashboard"
          description="Manage today's deliveries and upcoming pickups"
        />
      </div>
    </div>
  );
};

export default DriverDashboard;
