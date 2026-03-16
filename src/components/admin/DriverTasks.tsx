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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Route,
  Truck,
  User,
} from 'lucide-react';

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
import type { Database } from '@/types/supabase';
import {
  formatTaskDateTime,
  formatTaskTimeRange,
  getServiceTaskBadgeClassName,
  getServiceTaskStatusLabel,
  getServiceTaskTypeBadgeClassName,
  getServiceTaskTypeLabel,
  isFutureTask,
  isToday,
} from '@/lib/delivery/serviceTasks';
import { DeliveryProofDialog } from '@/components/driver/DeliveryProofDialog';
import { TaskEtaDialog } from '@/components/driver/TaskEtaDialog';
import { TaskFailureDialog } from '@/components/driver/TaskFailureDialog';

type TaskRow = Database['public']['Tables']['booking_service_tasks']['Row'];
type SlipRow = Pick<
  Database['public']['Tables']['delivery_slips']['Row'],
  'delivery_task_id' | 'id' | 'slip_number'
>;
type BookingItemRow = Pick<
  Database['public']['Tables']['booking_items']['Row'],
  'equipment_id' | 'equipment_name' | 'equipment_price' | 'quantity' | 'subtotal'
>;
type TaskBookingRow = Pick<
  Database['public']['Tables']['bookings']['Row'],
  | 'customer_address'
  | 'customer_email'
  | 'customer_name'
  | 'customer_phone'
  | 'delivery_failure_reason'
  | 'delivery_slot'
  | 'end_date'
  | 'id'
  | 'payment_status'
  | 'pickup_slot'
  | 'start_date'
  | 'status'
  | 'total_amount'
> & {
  booking_items?: BookingItemRow[] | null;
};

interface DriverProfile {
  id: string;
  name: string;
}

interface TaskQueryRow extends TaskRow {
  bookings: TaskBookingRow | null;
}

interface DriverTaskBoardItem {
  booking: TaskBookingRow;
  completedAt: string | null;
  customerAddress: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  etaWindowEnd: string | null;
  etaWindowStart: string | null;
  failureReason: string | null;
  publicTrackingToken: string;
  scheduledFor: string | null;
  signedByName: string | null;
  slipId: string | null;
  slipNumber: string | null;
  startedAt: string | null;
  status: string;
  taskId: string;
  taskType: string;
  notes: string | null;
  assignedDriverId: string | null;
  bookingItems: BookingItemRow[];
  totalAmount: number;
}

interface DriverTasksProps {
  scope?: 'current-user' | 'all-assigned';
  requiredPermission?: 'DriverTasks' | 'TaskMaster';
  title?: string;
  description?: string;
}

interface RouteStop {
  customerName: string;
  position: [number, number];
  taskId: string;
  taskType: string;
  timeLabel: string;
}

const ARUBA_CENTER: [number, number] = [12.5211, -69.9683];

export const DriverTasks = ({
  scope = 'current-user',
  requiredPermission = 'DriverTasks',
  title = 'Driver Tasks',
  description = 'Assigned deliveries and pickups',
}: DriverTasksProps) => {
  const [tasks, setTasks] = useState<DriverTaskBoardItem[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [routeTask, setRouteTask] = useState<DriverTaskBoardItem | null>(null);
  const [routeDestination, setRouteDestination] = useState<Coordinates | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routeMapOpen, setRouteMapOpen] = useState(false);
  const [etaDialogState, setEtaDialogState] = useState<{
    mode: 'start' | 'update';
    task: DriverTaskBoardItem;
  } | null>(null);
  const [failureTask, setFailureTask] = useState<DriverTaskBoardItem | null>(null);
  const [proofTask, setProofTask] = useState<DriverTaskBoardItem | null>(null);
  const { hasPermission, profile } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [tasksResult, driversResult] = await Promise.all([
        supabase
          .from('booking_service_tasks')
          .select(`
            id,
            booking_id,
            task_type,
            assigned_driver_id,
            scheduled_for,
            eta_window_start,
            eta_window_end,
            status,
            started_at,
            completed_at,
            failure_reason,
            public_tracking_token,
            signed_by_name,
            signature_path,
            notes,
            bookings (
              id,
              customer_name,
              customer_email,
              customer_phone,
              customer_address,
              start_date,
              end_date,
              status,
              total_amount,
              payment_status,
              delivery_slot,
              pickup_slot,
              delivery_failure_reason,
              booking_items (
                equipment_id,
                equipment_name,
                equipment_price,
                quantity,
                subtotal
              )
            )
          `)
          .order('scheduled_for', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, name')
          .eq('role', 'Driver'),
      ]);

      if (tasksResult.error) {
        throw tasksResult.error;
      }

      if (driversResult.error) {
        throw driversResult.error;
      }

      const taskRows = ((tasksResult.data || []) as TaskQueryRow[]).filter((row) => row.bookings);
      const deliveryTaskIds = taskRows
        .filter((row) => row.task_type === 'delivery')
        .map((row) => row.id);

      let slipMap = new Map<string, SlipRow>();
      if (deliveryTaskIds.length > 0) {
        const slipsResult = await supabase
          .from('delivery_slips')
          .select('id, delivery_task_id, slip_number')
          .in('delivery_task_id', deliveryTaskIds);

        if (slipsResult.error) {
          throw slipsResult.error;
        }

        slipMap = new Map(
          ((slipsResult.data || []) as SlipRow[]).map((slip) => [slip.delivery_task_id, slip]),
        );
      }

      const mappedTasks = taskRows.map((row) => {
        const booking = row.bookings as TaskBookingRow;
        const slip = slipMap.get(row.id);

        return {
          taskId: row.id,
          booking,
          bookingItems: booking.booking_items || [],
          customerAddress: booking.customer_address,
          customerEmail: booking.customer_email,
          customerName: booking.customer_name,
          customerPhone: booking.customer_phone,
          taskType: row.task_type,
          assignedDriverId: row.assigned_driver_id,
          scheduledFor: row.scheduled_for,
          etaWindowStart: row.eta_window_start,
          etaWindowEnd: row.eta_window_end,
          status: row.status,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          failureReason: row.failure_reason,
          publicTrackingToken: row.public_tracking_token,
          signedByName: row.signed_by_name,
          slipId: slip?.id || null,
          slipNumber: slip?.slip_number || null,
          notes: row.notes,
          totalAmount: Number(booking.total_amount || 0),
        } satisfies DriverTaskBoardItem;
      });

      setTasks(mappedTasks);
      setDrivers(driversResult.data || []);
    } catch (error) {
      console.error('Error fetching driver tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load driver tasks.',
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

    const tasksChannel = supabase
      .channel(`driver-service-tasks-${scope}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_service_tasks' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_items' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_slips' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [fetchData, hasPermission, requiredPermission, scope]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.assignedDriverId) return false;
      if (scope === 'all-assigned') return true;
      return task.assignedDriverId === profile?.id;
    });
  }, [profile?.id, scope, tasks]);

  const todayTasks = useMemo(
    () =>
      visibleTasks.filter(
        (task) => isToday(task.scheduledFor) && !['completed', 'cancelled'].includes(task.status),
      ),
    [visibleTasks],
  );

  const upcomingTasks = useMemo(
    () =>
      visibleTasks.filter(
        (task) =>
          !isToday(task.scheduledFor) &&
          isFutureTask(task.scheduledFor) &&
          !['completed', 'cancelled'].includes(task.status),
      ),
    [visibleTasks],
  );

  const historyTasks = useMemo(
    () =>
      [...visibleTasks]
        .filter((task) => ['completed', 'failed', 'cancelled'].includes(task.status))
        .sort((left, right) => {
          const leftValue = new Date(left.completedAt || left.scheduledFor || 0).getTime();
          const rightValue = new Date(right.completedAt || right.scheduledFor || 0).getTime();
          return rightValue - leftValue;
        }),
    [visibleTasks],
  );

  useEffect(() => {
    let cancelled = false;

    const buildRouteStops = async () => {
      if (todayTasks.length === 0) {
        setRouteStops([]);
        return;
      }

      const nextStops = await Promise.all(
        todayTasks.map(async (task) => {
          const coordinates = await geocodeAddress(task.customerAddress);
          if (!coordinates) return null;

          return {
            taskId: task.taskId,
            customerName: task.customerName,
            position: [coordinates.lat, coordinates.lng] as [number, number],
            taskType: task.taskType,
            timeLabel: formatTaskTimeRange(task.etaWindowStart, task.etaWindowEnd)
              || formatTaskDateTime(task.scheduledFor),
          };
        }),
      );

      if (!cancelled) {
        setRouteStops(nextStops.filter((stop): stop is RouteStop => Boolean(stop)));
      }
    };

    void buildRouteStops();

    return () => {
      cancelled = true;
    };
  }, [todayTasks]);

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return 'Unassigned';
    return drivers.find((driver) => driver.id === driverId)?.name || 'Unknown driver';
  };

  const sendTrackingEmail = async (taskId: string) => {
    const result = await supabase.functions.invoke('send-delivery-tracking-email', {
      body: { task_id: taskId },
    });

    if (result.error) {
      console.error('Error sending tracking email:', result.error);
      toast({
        title: 'Tracking Email Failed',
        description: 'The customer update email could not be sent.',
      });
    }
  };

  const notifyBookingStatusEmail = async (task: DriverTaskBoardItem, newStatus: string) => {
    const equipmentDetails = task.bookingItems
      .map((item) => `${item.equipment_name} (x${item.quantity})`)
      .join(', ');

    const result = await supabase.functions.invoke('booking-status-update-email', {
      body: {
        customer_email: task.customerEmail,
        customer_name: task.customerName,
        booking_id: task.booking.id,
        new_status: newStatus,
        old_status: task.booking.status,
        start_date: task.booking.start_date,
        equipment_details: equipmentDetails,
      },
    });

    if (result.error) {
      console.error('Error sending booking status email:', result.error);
    }
  };

  const invokeTaskRpc = async (
    key: string,
    action: () => Promise<void>,
  ) => {
    setActionKey(key);
    try {
      await action();
      await fetchData();
    } finally {
      setActionKey(null);
    }
  };

  const handleStartTask = async (task: DriverTaskBoardItem) => {
    if (task.taskType === 'delivery') {
      setEtaDialogState({ mode: 'start', task });
      return;
    }

    await invokeTaskRpc(`${task.taskId}:start`, async () => {
      const result = await supabase.rpc('mark_service_task_en_route', {
        p_task_id: task.taskId,
      });

      if (result.error) throw result.error;

      toast({
        title: 'Task Started',
        description: `${getServiceTaskTypeLabel(task.taskType)} is now underway.`,
      });
    });
  };

  const handleEtaConfirm = async ({
    etaEnd,
    etaStart,
  }: {
    etaEnd: string;
    etaStart: string;
  }) => {
    const dialogState = etaDialogState;
    if (!dialogState) return;

    const rpcName = dialogState.mode === 'start'
      ? 'mark_service_task_en_route'
      : 'update_service_task_eta';

    await invokeTaskRpc(`${dialogState.task.taskId}:${dialogState.mode}`, async () => {
      const result = await supabase.rpc(rpcName, {
        p_task_id: dialogState.task.taskId,
        p_eta_window_start: etaStart,
        p_eta_window_end: etaEnd,
      });

      if (result.error) throw result.error;

      await sendTrackingEmail(dialogState.task.taskId);
      toast({
        title: dialogState.mode === 'start' ? 'Task Started' : 'ETA Updated',
        description: 'Customer tracking has been updated.',
      });
    });

    setEtaDialogState(null);
  };

  const handleArrived = async (task: DriverTaskBoardItem) => {
    await invokeTaskRpc(`${task.taskId}:arrived`, async () => {
      const result = await supabase.rpc('mark_service_task_arrived', {
        p_task_id: task.taskId,
      });

      if (result.error) throw result.error;

      if (task.taskType === 'delivery') {
        await sendTrackingEmail(task.taskId);
      }

      toast({
        title: 'Arrival Confirmed',
        description: `${getServiceTaskTypeLabel(task.taskType)} marked as arrived.`,
      });
    });
  };

  const handleFailureConfirm = async (reason: string) => {
    const task = failureTask;
    if (!task) return;

    await invokeTaskRpc(`${task.taskId}:fail`, async () => {
      const result = await supabase.rpc('fail_delivery_task', {
        p_task_id: task.taskId,
        p_failure_reason: reason,
      });

      if (result.error) throw result.error;

      await notifyBookingStatusEmail(task, 'undeliverable');
      toast({
        title: 'Delivery Marked as Failed',
        description: 'The booking and customer status were updated.',
      });
    });

    setFailureTask(null);
  };

  const handlePickupComplete = async (task: DriverTaskBoardItem) => {
    await invokeTaskRpc(`${task.taskId}:complete`, async () => {
      const result = await supabase.rpc('complete_pickup_task', {
        p_task_id: task.taskId,
        p_notes: task.notes ?? undefined,
      });

      if (result.error) throw result.error;

      toast({
        title: 'Pickup Completed',
        description: 'The pickup has been completed successfully.',
      });
    });
  };

  const handleProofCompleted = async (_slipId: string | null) => {
    await fetchData();
  };

  const openRoutePreview = async (task: DriverTaskBoardItem) => {
    setRouteTask(task);
    setRouteDestination(null);
    setRouteLoading(true);

    try {
      const coordinates = await geocodeAddress(task.customerAddress);
      setRouteDestination(coordinates);
      if (!coordinates) {
        toast({
          title: 'Address not mapped',
          description: 'This address could not be placed on the map. OpenStreetMap search is still available.',
        });
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      toast({
        title: 'Route Lookup Failed',
        description: 'The route preview could not be loaded.',
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
        title: 'Opened Search Instead',
        description: 'Current location was unavailable, so the destination search was opened instead.',
      });
    }
  };

  const renderTaskActions = (task: DriverTaskBoardItem) => {
    const keyBase = task.taskId;

    return (
      <div className="flex flex-col gap-2">
        {task.status === 'scheduled' || task.status === 'failed' ? (
          <Button
            size="sm"
            onClick={() => void handleStartTask(task)}
            disabled={actionKey === `${keyBase}:start`}
          >
            {task.status === 'failed' ? `Retry ${getServiceTaskTypeLabel(task.taskType)}` : `Start ${getServiceTaskTypeLabel(task.taskType)}`}
          </Button>
        ) : null}

        {(task.status === 'en_route' || task.status === 'arrived') && task.taskType === 'delivery' ? (
          <Button
            size="sm"
            variant={task.status === 'arrived' ? 'default' : 'outline'}
            onClick={() => setProofTask(task)}
          >
            Complete Delivery
          </Button>
        ) : null}

        {(task.status === 'en_route' || task.status === 'arrived') && task.taskType === 'pickup' ? (
          <Button
            size="sm"
            onClick={() => void handlePickupComplete(task)}
            disabled={actionKey === `${keyBase}:complete`}
          >
            Complete Pickup
          </Button>
        ) : null}

        {(task.status === 'en_route' || task.status === 'scheduled') ? (
          <Button size="sm" variant="outline" onClick={() => setEtaDialogState({ mode: 'update', task })}>
            Update ETA
          </Button>
        ) : null}

        {task.status === 'en_route' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleArrived(task)}
            disabled={actionKey === `${keyBase}:arrived`}
          >
            Mark Arrived
          </Button>
        ) : null}

        {(task.status === 'scheduled' || task.status === 'en_route' || task.status === 'arrived') && task.taskType === 'delivery' ? (
          <Button size="sm" variant="destructive" onClick={() => setFailureTask(task)}>
            Mark Failed
          </Button>
        ) : null}

        <Button size="sm" variant="outline" onClick={() => void openRoutePreview(task)}>
          View Route
        </Button>

        {task.taskType === 'delivery' ? (
          <Button size="sm" variant="ghost" onClick={() => window.open(`/track/${task.publicTrackingToken}`, '_blank', 'noopener,noreferrer')}>
            Open Tracking
          </Button>
        ) : null}

        {task.slipId ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(`/delivery-slip/${task.slipId}`, '_blank', 'noopener,noreferrer')}
          >
            View Slip
          </Button>
        ) : null}
      </div>
    );
  };

  const renderTaskCard = (task: DriverTaskBoardItem) => (
    <div
      key={task.taskId}
      className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{task.customerName}</h3>
            <Badge className={getServiceTaskTypeBadgeClassName(task.taskType)}>
              {getServiceTaskTypeLabel(task.taskType)}
            </Badge>
            <Badge className={getServiceTaskBadgeClassName(task.status)}>
              {getServiceTaskStatusLabel(task.status)}
            </Badge>
            {scope === 'all-assigned' ? (
              <Badge variant="secondary">{getDriverName(task.assignedDriverId)}</Badge>
            ) : null}
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{task.customerAddress}</span>
            </div>
            <button
              type="button"
              onClick={() => window.location.href = `tel:${task.customerPhone}`}
              className="flex items-center gap-2 text-left hover:text-foreground"
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span>{task.customerPhone}</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.href = `mailto:${task.customerEmail}`}
              className="flex items-center gap-2 text-left hover:text-foreground"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span>{task.customerEmail}</span>
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{formatTaskDateTime(task.scheduledFor)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0" />
              <span>{formatTaskTimeRange(task.etaWindowStart, task.etaWindowEnd) || 'ETA not set yet'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0" />
              <span>{task.bookingItems.length} item(s) - ${task.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {task.failureReason ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Failure reason: {task.failureReason}
            </div>
          ) : null}

          {task.signedByName ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Signed by {task.signedByName}
              {task.slipNumber ? ` - ${task.slipNumber}` : ''}
            </div>
          ) : null}

          {task.notes ? (
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {task.notes}
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Items</p>
            <div className="grid gap-2 md:grid-cols-2">
              {task.bookingItems.map((item) => (
                <div key={`${task.taskId}-${item.equipment_id}-${item.equipment_name}`} className="rounded-xl border border-border/60 px-3 py-2 text-sm">
                  <div className="font-medium text-foreground">{item.equipment_name}</div>
                  <div className="text-muted-foreground">
                    Qty {item.quantity} - ${Number(item.subtotal || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-[180px]">{renderTaskActions(task)}</div>
      </div>
    </div>
  );

  if (!hasPermission(requiredPermission)) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">You do not have permission to access this task view.</p>
      </div>
    );
  }

  return (
    <LoadingState isLoading={loading} message="Loading tasks...">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-semibold text-foreground">{todayTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-semibold text-foreground">{upcomingTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-semibold text-foreground">
                {historyTasks.filter((task) => task.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Needs Attention</p>
              <p className="text-2xl font-semibold text-foreground">
                {visibleTasks.filter((task) => task.status === 'failed').length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Today's Route
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {routeStops.length > 0 ? (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border/60">
                    <DynamicMap
                      center={routeStops[0]?.position || ARUBA_CENTER}
                      zoom={12}
                      markers={routeStops.map((stop) => ({
                        position: stop.position,
                        popup: `${stop.customerName} - ${getServiceTaskTypeLabel(stop.taskType)} - ${stop.timeLabel}`,
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    {routeStops.map((stop, index) => (
                      <div key={stop.taskId} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium text-foreground">
                            Stop {index + 1}: {stop.customerName}
                          </div>
                          <div className="text-muted-foreground">
                            {getServiceTaskTypeLabel(stop.taskType)} - {stop.timeLabel}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setRouteMapOpen(true)}>
                          Expand
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No route map available for today's tasks yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Driver Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Start the task from the dashboard.</p>
              <p>Update the ETA so the customer sees the expected arrival window.</p>
              <p>Capture a signature on screen to complete delivery and issue the stored slip.</p>
              <p>Use the tracking link button to verify what the customer is seeing.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Today's Tasks ({todayTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayTasks.length > 0 ? (
              todayTasks.map(renderTaskCard)
            ) : (
              <p className="py-8 text-center text-muted-foreground">No tasks scheduled for today.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Upcoming Tasks ({upcomingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map(renderTaskCard)
            ) : (
              <p className="py-8 text-center text-muted-foreground">No upcoming tasks.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed and Issue History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {historyTasks.length > 0 ? (
              historyTasks.map(renderTaskCard)
            ) : (
              <p className="py-8 text-center text-muted-foreground">No completed or failed tasks yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(routeTask)} onOpenChange={(nextOpen) => !nextOpen && setRouteTask(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Route Preview</DialogTitle>
            <DialogDescription>
              {routeTask
                ? `${routeTask.customerName} - ${routeTask.customerAddress}`
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
                  popup: `${routeTask.customerName} - ${getServiceTaskTypeLabel(routeTask.taskType)}`,
                },
              ]}
            />
          ) : (
            <div className="py-8 text-sm text-muted-foreground">
              Map preview unavailable for this address. You can still open the destination in OpenStreetMap search.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => routeTask && window.open(buildOpenStreetMapSearchUrl(routeTask.customerAddress), '_blank', 'noopener,noreferrer')}
            >
              Open Search
            </Button>
            <Button onClick={() => void openExternalRoute()} disabled={!routeTask}>
              Open Directions
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={routeMapOpen} onOpenChange={setRouteMapOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Today's Route Map</DialogTitle>
            <DialogDescription>
              All geocoded stops scheduled for today.
            </DialogDescription>
          </DialogHeader>
          <DynamicMap
            center={routeStops[0]?.position || ARUBA_CENTER}
            zoom={12}
            markers={routeStops.map((stop) => ({
              position: stop.position,
              popup: `${stop.customerName} - ${getServiceTaskTypeLabel(stop.taskType)} - ${stop.timeLabel}`,
            }))}
          />
        </DialogContent>
      </Dialog>

      {etaDialogState ? (
        <TaskEtaDialog
          customerName={etaDialogState.task.customerName}
          etaEnd={etaDialogState.task.etaWindowEnd}
          etaStart={etaDialogState.task.etaWindowStart}
          mode={etaDialogState.mode}
          onClose={() => setEtaDialogState(null)}
          onConfirm={handleEtaConfirm}
          open={Boolean(etaDialogState)}
          taskLabel={getServiceTaskTypeLabel(etaDialogState.task.taskType)}
        />
      ) : null}

      {failureTask ? (
        <TaskFailureDialog
          customerName={failureTask.customerName}
          onClose={() => setFailureTask(null)}
          onConfirm={handleFailureConfirm}
          open={Boolean(failureTask)}
        />
      ) : null}

      {proofTask ? (
        <DeliveryProofDialog
          bookingId={proofTask.booking.id}
          customerName={proofTask.customerName}
          onClose={() => setProofTask(null)}
          onCompleted={handleProofCompleted}
          open={Boolean(proofTask)}
          taskId={proofTask.taskId}
        />
      ) : null}
    </LoadingState>
  );
};
