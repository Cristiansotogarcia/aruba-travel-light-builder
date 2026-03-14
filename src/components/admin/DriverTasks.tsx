import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LoadingState from '@/components/common/LoadingState';
import DynamicMap from '@/components/common/dynamic/DynamicMap';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, MapPin, Phone, Mail, Truck, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  buildOpenStreetMapDirectionsUrl,
  buildOpenStreetMapSearchUrl,
  geocodeAddress,
  getCurrentLocation,
  type Coordinates,
} from '@/lib/services/osmRouting';
import {
  DRIVER_ASSIGNABLE_STATUSES,
  buildDriverTasks,
  buildTaskCompletionUpdate,
  buildTaskStartUpdate,
  getAssignedDriverId,
  type DriverTaskModel,
  type DriverTaskType,
  type OperationalBooking,
} from '@/lib/operations/bookingOperations';

interface DriverProfile {
  id: string;
  name: string;
}

interface DriverTasksProps {
  scope?: 'current-user' | 'all-assigned';
  requiredPermission?: 'DriverTasks' | 'TaskMaster';
  title?: string;
  description?: string;
}

const shouldShowTask = (booking: OperationalBooking, taskType: DriverTaskType) => {
  if (taskType === 'delivery') {
    return booking.status !== 'cancelled' && booking.status !== 'completed' && booking.status !== 'rejected';
  }

  return booking.status === 'delivered';
};

const getTaskBadgeColor = (taskType: DriverTaskType) => {
  return taskType === 'delivery'
    ? 'bg-green-100 text-green-800'
    : 'bg-blue-100 text-blue-800';
};

export const DriverTasks = ({
  scope = 'current-user',
  requiredPermission = 'DriverTasks',
  title = 'Driver Tasks',
  description = 'Assigned deliveries and pickups',
}: DriverTasksProps) => {
  const [bookings, setBookings] = useState<OperationalBooking[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [routeTask, setRouteTask] = useState<DriverTaskModel | null>(null);
  const [routeDestination, setRouteDestination] = useState<Coordinates | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const { hasPermission, profile } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: bookingRows, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, booking_items(equipment_id, equipment_name, equipment_price, quantity, subtotal)')
        .in('status', DRIVER_ASSIGNABLE_STATUSES)
        .order('start_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      const { data: driverRows, error: driversError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'Driver');

      if (driversError) throw driversError;

      setBookings((bookingRows || []) as OperationalBooking[]);
      setDrivers(driverRows || []);
    } catch (error) {
      console.error('Error fetching driver tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load driver tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!hasPermission(requiredPermission)) {
      setLoading(false);
      return;
    }

    fetchData();

    const subscription = supabase
      .channel(`driver-tasks-${scope}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchData, hasPermission, requiredPermission, scope]);

  const visibleTasks = useMemo(() => {
    const filteredBookings = bookings.filter((booking) => {
      const assignedDriverId = getAssignedDriverId(booking);

      if (!assignedDriverId) return false;
      if (scope === 'all-assigned') return true;

      return assignedDriverId === profile?.id;
    });

    return filteredBookings.flatMap((booking) =>
      buildDriverTasks(booking).filter((task) => shouldShowTask(booking, task.taskType)),
    );
  }, [bookings, profile?.id, scope]);

  const todayTasks = useMemo(() => {
    const today = new Date().toDateString();
    return visibleTasks.filter((task) => new Date(task.scheduledAt).toDateString() === today);
  }, [visibleTasks]);

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return visibleTasks
      .filter((task) => new Date(task.scheduledAt) >= now && !todayTasks.includes(task))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [todayTasks, visibleTasks]);

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return 'Unassigned';
    return drivers.find((driver) => driver.id === driverId)?.name || 'Unknown driver';
  };

  const insertAuditLog = async (task: DriverTaskModel, action: string, notes?: string) => {
    if (!profile?.id) return;

    const { error } = await supabase
      .from('booking_audit_log')
      .insert({
        booking_id: task.bookingId,
        user_id: profile.id,
        action,
        old_status: task.status,
        new_status: task.status,
        notes,
        metadata: {
          task_type: task.taskType,
          assigned_driver_id: task.assignedDriverId,
        },
      });

    if (error) {
      console.error('Error inserting driver task audit log:', error);
    }
  };

  const updateTask = async (task: DriverTaskModel, mode: 'start' | 'complete' | 'fail') => {
    const currentBooking = bookings.find((booking) => booking.id === task.bookingId);
    if (!currentBooking) return;

    const updateKey = `${task.bookingId}:${task.taskType}:${mode}`;
    setActionKey(updateKey);

    try {
      let update;
      let action = '';
      let notes = '';

      if (mode === 'start') {
        update = buildTaskStartUpdate(task.taskType);
        action = task.taskType === 'delivery' ? 'START_DELIVERY' : 'START_PICKUP';
        notes = task.taskType === 'delivery' ? 'Driver started delivery' : 'Driver started pickup';
      } else if (mode === 'fail') {
        const failureReason = window.prompt('Add a delivery failure reason');
        if (!failureReason) {
          setActionKey(null);
          return;
        }
        update = buildTaskCompletionUpdate('delivery', { failureReason });
        action = 'FAIL_DELIVERY';
        notes = failureReason;
      } else {
        update = buildTaskCompletionUpdate(task.taskType);
        action = task.taskType === 'delivery' ? 'COMPLETE_DELIVERY' : 'COMPLETE_PICKUP';
        notes = task.taskType === 'delivery' ? 'Driver completed delivery' : 'Driver completed pickup';
      }

      const { error } = await supabase
        .from('bookings')
        .update(update)
        .eq('id', task.bookingId);

      if (error) throw error;

      await insertAuditLog(task, action, notes);
      await fetchData();

      toast({
        title: 'Task updated',
        description:
          mode === 'start'
            ? 'Task has been started.'
            : mode === 'fail'
              ? 'Delivery marked as undeliverable.'
              : 'Task completed successfully.',
      });
    } catch (error) {
      console.error('Error updating driver task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update driver task',
        variant: 'destructive',
      });
    } finally {
      setActionKey(null);
    }
  };

  const openRoutePreview = async (task: DriverTaskModel) => {
    setRouteTask(task);
    setRouteDestination(null);
    setRouteLoading(true);

    try {
      const coordinates = await geocodeAddress(task.customerAddress);
      setRouteDestination(coordinates);
      if (!coordinates) {
        toast({
          title: 'Address not mapped',
          description: 'Could not geocode this address. You can still open it in OpenStreetMap search.',
        });
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      toast({
        title: 'Route lookup failed',
        description: 'Could not load the map preview for this address.',
        variant: 'destructive',
      });
    } finally {
      setRouteLoading(false);
    }
  };

  const openExternalRoute = async () => {
    if (!routeTask) return;

    if (!routeDestination) {
      window.open(buildOpenStreetMapSearchUrl(routeTask.customerAddress), '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const origin = await getCurrentLocation();
      window.open(
        buildOpenStreetMapDirectionsUrl(routeDestination, origin),
        '_blank',
        'noopener,noreferrer',
      );
    } catch (error) {
      console.error('Error getting current location:', error);
      window.open(buildOpenStreetMapSearchUrl(routeTask.customerAddress), '_blank', 'noopener,noreferrer');
      toast({
        title: 'Opened address search instead',
        description: 'Current location was unavailable, so the destination was opened in OpenStreetMap search.',
      });
    }
  };

  const renderActions = (task: DriverTaskModel) => {
    const currentKeyBase = `${task.bookingId}:${task.taskType}`;

    if (task.taskType === 'delivery') {
      if (task.status === 'confirmed' || task.status === 'undeliverable') {
        return (
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={() => updateTask(task, 'start')}
              disabled={actionKey === `${currentKeyBase}:start`}
            >
              {task.status === 'undeliverable' ? 'Retry Delivery' : 'Start Delivery'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openRoutePreview(task)}
            >
              View Route
            </Button>
          </div>
        );
      }

      if (task.status === 'out_for_delivery') {
        return (
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={() => updateTask(task, 'complete')}
              disabled={actionKey === `${currentKeyBase}:complete`}
            >
              Mark Delivered
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateTask(task, 'fail')}
              disabled={actionKey === `${currentKeyBase}:fail`}
            >
              Mark Undeliverable
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openRoutePreview(task)}
            >
              View Route
            </Button>
          </div>
        );
      }
    }

    if (task.taskType === 'pickup' && task.status === 'delivered') {
      return (
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => updateTask(task, 'complete')}
            disabled={actionKey === `${currentKeyBase}:complete`}
          >
            Mark Picked Up
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openRoutePreview(task)}
          >
            View Route
          </Button>
        </div>
      );
    }

    return null;
  };

  const renderTaskCard = (task: DriverTaskModel) => (
    <div key={`${task.bookingId}-${task.taskType}`} className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="font-medium text-gray-900">{task.customerName}</h3>
            <Badge className={getTaskBadgeColor(task.taskType)}>{task.taskType}</Badge>
            <Badge className="bg-slate-100 text-slate-700">{task.status}</Badge>
            {scope === 'all-assigned' && (
              <Badge variant="secondary">{getDriverName(task.assignedDriverId)}</Badge>
            )}
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {task.customerAddress}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {task.customerPhone}
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {task.customerEmail}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(task.scheduledAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              {task.bookingItems.length} item(s) for ${task.totalAmount.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="min-w-[160px] flex justify-end">
          {renderActions(task)}
        </div>
      </div>
    </div>
  );

  if (!hasPermission(requiredPermission)) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to access this task view.</p>
      </div>
    );
  }

  return (
    <LoadingState isLoading={loading} message="Loading tasks...">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>

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
                todayTasks.map(renderTaskCard)
              ) : (
                <p className="text-gray-500 text-center py-8">No tasks scheduled for today</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Upcoming Tasks ({upcomingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map(renderTaskCard)
              ) : (
                <p className="text-gray-500 text-center py-8">No upcoming tasks</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(routeTask)} onOpenChange={(open) => !open && setRouteTask(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Route Preview</DialogTitle>
            <DialogDescription>
              {routeTask
                ? `${routeTask.customerName} · ${routeTask.customerAddress}`
                : 'Loading route details'}
            </DialogDescription>
          </DialogHeader>
          {routeLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading route preview...</div>
          ) : routeTask && routeDestination ? (
            <DynamicMap
              center={[routeDestination.lat, routeDestination.lng]}
              zoom={15}
              markers={[
                {
                  position: [routeDestination.lat, routeDestination.lng],
                  popup: `${routeTask.customerName} · ${routeTask.taskType}`,
                },
              ]}
            />
          ) : (
            <div className="py-8 text-sm text-muted-foreground">
              Map preview unavailable for this address. You can still open the destination in OpenStreetMap.
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => routeTask && window.open(buildOpenStreetMapSearchUrl(routeTask.customerAddress), '_blank', 'noopener,noreferrer')}
            >
              Open Search
            </Button>
            <Button onClick={openExternalRoute} disabled={!routeTask}>
              Open Directions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LoadingState>
  );
};
