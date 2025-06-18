
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Phone, Mail, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  task_type: 'delivery' | 'pickup';
}

export const DriverTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (hasPermission('DriverTasks') && profile?.id) {
      fetchTasks(profile.id); // Pass profile.id directly
    }
  }, [hasPermission, profile]);

  const fetchTasks = async (driverId: string) => { // Add driverId parameter
    try {
      // Fetch bookings assigned to current driver
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('assigned_to', driverId) // Use driverId here
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Convert bookings to tasks (delivery + pickup)
      const allTasks: Task[] = [];
      data?.forEach(booking => {
        // Delivery task
        allTasks.push({
          ...booking,
          task_type: 'delivery'
        });
        // Pickup task
        allTasks.push({
          ...booking,
          task_type: 'pickup'
        });
      });

      setTasks(allTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTaskDate = (task: Task) => {
    return task.task_type === 'delivery' ? task.start_date : task.end_date;
  };

  const getTaskColor = (taskType: 'delivery' | 'pickup') => {
    return taskType === 'delivery' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-blue-100 text-blue-800';
  };

  if (!hasPermission('DriverTasks')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to access driver tasks.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const upcomingTasks = tasks
    .filter(task => new Date(getTaskDate(task)) >= new Date())
    .sort((a, b) => new Date(getTaskDate(a)).getTime() - new Date(getTaskDate(b)).getTime());

  const todayTasks = upcomingTasks.filter(task => {
    const taskDate = new Date(getTaskDate(task));
    const today = new Date();
    return taskDate.toDateString() === today.toDateString();
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-1">Your assigned deliveries and pickups</p>
      </div>

      {/* Today's Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Today's Tasks ({todayTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayTasks.length > 0 ? (
              todayTasks.map((task) => ( // Removed unused index
                <div key={`${task.id}-${task.task_type}`} className="p-4 border border-gray-200 rounded-lg bg-yellow-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{task.customer_name}</h3>
                        <Badge className={getTaskColor(task.task_type)}>
                          {task.task_type}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {task.customer_address}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {task.customer_phone}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {task.customer_email}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(getTaskDate(task)).toLocaleDateString()} at {new Date(getTaskDate(task)).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm">
                        Mark Complete
                      </Button>
                      <Button variant="outline" size="sm">
                        View Map
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No tasks scheduled for today</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Tasks ({upcomingTasks.length - todayTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingTasks.filter(task => !todayTasks.includes(task)).length > 0 ? (
              upcomingTasks
                .filter(task => !todayTasks.includes(task))
                .map((task) => ( // Removed unused index
                  <div key={`${task.id}-${task.task_type}`} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{task.customer_name}</h3>
                          <Badge className={getTaskColor(task.task_type)}>
                            {task.task_type}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {task.customer_address}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(getTaskDate(task)).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming tasks</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
