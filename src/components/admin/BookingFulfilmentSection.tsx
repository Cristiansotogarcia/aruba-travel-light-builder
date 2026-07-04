import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  getServiceTaskBadgeClassName,
  getServiceTaskStatusLabel,
  getServiceTaskTypeBadgeClassName,
  getServiceTaskTypeLabel,
  formatTaskDateTime,
} from '@/lib/delivery/serviceTasks';
import Spinner from '@/components/common/Spinner';

interface BookingFulfilmentSectionProps {
  bookingId: string;
}

interface FulfilmentTask {
  id: string;
  task_type: string;
  status: string;
  scheduled_for: string | null;
  completed_at: string | null;
  failure_reason: string | null;
}

/**
 * Read-only fulfilment (delivery / pickup / collection) task state for the admin
 * booking detail. Surfaces the same driver/depot progress the field apps act on
 * (W3) inside the one coherent booking view, using the shared serviceTasks
 * badge vocabulary so it matches the driver + customer dashboards.
 */
export const BookingFulfilmentSection = ({ bookingId }: BookingFulfilmentSectionProps) => {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['booking-service-tasks', bookingId],
    queryFn: async (): Promise<FulfilmentTask[]> => {
      const { data, error } = await supabase
        .from('booking_service_tasks')
        .select('id, task_type, status, scheduled_for, completed_at, failure_reason')
        .eq('booking_id', bookingId)
        .in('task_type', ['delivery', 'pickup'])
        .order('scheduled_for', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FulfilmentTask[];
    },
    enabled: !!bookingId,
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Fulfilment
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" message="Loading tasks..." />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-gray-500">No delivery or pickup tasks scheduled yet.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getServiceTaskTypeBadgeClassName(task.task_type)}>
                    {getServiceTaskTypeLabel(task.task_type)}
                  </Badge>
                  <Badge className={getServiceTaskBadgeClassName(task.status)}>
                    {task.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {task.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {getServiceTaskStatusLabel(task.status)}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {task.status === 'completed' && task.completed_at
                    ? `Completed ${formatTaskDateTime(task.completed_at)}`
                    : formatTaskDateTime(task.scheduled_for)}
                  {task.failure_reason && (
                    <div className="text-rose-600">{task.failure_reason}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
