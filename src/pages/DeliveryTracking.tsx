import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  formatTaskDateTime,
  formatTaskTimeRange,
  getServiceTaskBadgeClassName,
  getServiceTaskStatusLabel,
  getServiceTaskTypeLabel,
} from '@/lib/delivery/serviceTasks';

interface TrackingPayload {
  booking: {
    customer_name: string;
    delivery_slot: string | null;
    end_date: string;
    id: string;
    pickup_slot: string | null;
    start_date: string;
    status: string;
  };
  completed_at: string | null;
  driver: {
    id: string | null;
    name: string | null;
  };
  eta_window_end: string | null;
  eta_window_start: string | null;
  failure_reason: string | null;
  signed_by_name: string | null;
  slip_id: string | null;
  started_at: string | null;
  task_id: string;
  task_status: string;
  task_type: string;
}

const DeliveryTracking = () => {
  const { token } = useParams<{ token: string }>();
  const [payload, setPayload] = useState<TrackingPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTracking = async () => {
      if (!token) {
        setErrorMessage('Missing tracking token.');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_public_tracking_details', {
          p_tracking_token: token,
        });

        if (error || !data) {
          throw error || new Error('Tracking details not found.');
        }

        setPayload(data as TrackingPayload);
      } catch (error) {
        console.error('Error loading delivery tracking:', error);
        setErrorMessage('Unable to load delivery tracking details.');
      } finally {
        setLoading(false);
      }
    };

    void loadTracking();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-4xl px-4 text-center text-muted-foreground">
          Loading tracking...
        </div>
      </div>
    );
  }

  if (errorMessage || !payload) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-semibold text-foreground">Tracking Unavailable</h1>
              <p className="mt-3 text-muted-foreground">{errorMessage || 'Tracking details were not found.'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const trackingWindow = formatTaskTimeRange(payload.eta_window_start, payload.eta_window_end);

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Delivery Tracking</h1>
          <p className="mt-1 text-muted-foreground">
            Booking {payload.booking.id.slice(0, 8).toUpperCase()} for {payload.booking.customer_name}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>{getServiceTaskTypeLabel(payload.task_type)}</span>
              <Badge className={getServiceTaskBadgeClassName(payload.task_status)}>
                {getServiceTaskStatusLabel(payload.task_status)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Scheduled:</span> {formatTaskDateTime(payload.booking.start_date)}</p>
              <p><span className="font-medium text-foreground">Expected between:</span> {trackingWindow || 'To be confirmed'}</p>
              <p><span className="font-medium text-foreground">Driver:</span> {payload.driver.name || 'Assigned team member'}</p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              {payload.started_at ? (
                <p><span className="font-medium text-foreground">Started:</span> {formatTaskDateTime(payload.started_at)}</p>
              ) : null}
              {payload.completed_at ? (
                <p><span className="font-medium text-foreground">Completed:</span> {formatTaskDateTime(payload.completed_at)}</p>
              ) : null}
              {payload.signed_by_name ? (
                <p><span className="font-medium text-foreground">Signed by:</span> {payload.signed_by_name}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border/60 bg-white px-4 py-3">
              Booking confirmed for {new Date(payload.booking.start_date).toLocaleDateString()}.
            </div>
            <div className="rounded-xl border border-border/60 bg-white px-4 py-3">
              Driver expected between {trackingWindow || 'a time window that will be shared soon'}.
            </div>
            {payload.task_status === 'en_route' || payload.task_status === 'arrived' || payload.task_status === 'completed' ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
                Driver underway.
              </div>
            ) : null}
            {payload.task_status === 'arrived' ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
                Driver has arrived at the delivery location.
              </div>
            ) : null}
            {payload.task_status === 'completed' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                Delivery completed. Your signed proof of delivery has been emailed.
              </div>
            ) : null}
            {payload.task_status === 'failed' ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                Delivery issue reported: {payload.failure_reason || 'Please contact support.'}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {payload.slip_id ? (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Tracking
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DeliveryTracking;
