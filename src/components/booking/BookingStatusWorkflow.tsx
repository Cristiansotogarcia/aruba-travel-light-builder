import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Status = 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'undeliverable';

const statusTransitions: Record<Status, Status[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'undeliverable'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  undeliverable: ['out_for_delivery', 'cancelled']
};

export function BookingStatusWorkflow({ bookingId }: { bookingId: string }) {
  const supabase = createClient();
  const [currentStatus, setCurrentStatus] = useState<Status>('pending');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single();

      if (!error && data?.status) {
        setCurrentStatus(data.status as Status);
      }
    };

    fetchStatus();
  }, [bookingId]);

  const handleStatusUpdate = async (newStatus: Status) => {
    setLoading(true);
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (!error) {
      setCurrentStatus(newStatus);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center gap-2">
        <span className="font-medium">Current Status:</span>
        <Badge variant={currentStatus === 'cancelled' ? 'destructive' : 'default'}>
          {currentStatus.replace(/_/g, ' ').toUpperCase()}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusTransitions[currentStatus].map((status) => (
          <Button
            key={status}
            variant="outline"
            onClick={() => handleStatusUpdate(status)}
            disabled={loading}
            className="transition-colors duration-200"
          >
            {status === 'out_for_delivery' ? 'Mark as Out for Delivery' : 
             status.replace(/_/g, ' ').toUpperCase()}
          </Button>
        ))}
      </div>
    </div>
  );
}