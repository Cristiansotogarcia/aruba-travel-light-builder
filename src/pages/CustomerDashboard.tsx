
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header'; // Changed to named import
import { useAuth } from '@/hooks/useAuth';
import { isSuccessfulBookingPaymentStatus } from '@/lib/accounting/invoices';
import {
  formatTaskDateTime,
  formatTaskTimeRange,
  getServiceTaskBadgeClassName,
  getServiceTaskStatusLabel,
  getServiceTaskTypeLabel,
} from '@/lib/delivery/serviceTasks';
import {
  getStatusColor,
  getStatusLabel,
  getPaymentStatusColor,
  getPaymentStatusLabel,
} from '@/components/admin/calendar/statusUtils';
import { BookingCardSkeleton } from '@/components/common/SkeletonLoader';
import { Package, Truck, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { BookingSelfServiceActions } from '@/components/customer/BookingSelfServiceActions';

// Define interfaces for booking data
interface CustomerBookingItem {
  equipment_id: string;
  equipment_name: string;
  quantity: number;
}

interface CustomerBooking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  payment_status: string | null;
  hold_expires_at: string | null;
  booking_items: CustomerBookingItem[];
  customer_comment: string | null;
  delivery_slot: string | null;
}

interface ServiceTask {
  id: string;
  booking_id: string;
  task_type: string;
  status: string;
  scheduled_for: string | null;
  eta_window_start: string | null;
  eta_window_end: string | null;
  public_tracking_token: string | null;
  completed_at: string | null;
  failure_reason: string | null;
}

type DeliveryTaskWithSlip = ServiceTask;

const CustomerDashboard = () => {
  const { user } = useAuth();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['customer-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_date,
          end_date,
          total_amount,
          status,
          payment_status,
          hold_expires_at,
          customer_comment,
          delivery_slot,
          booking_items ( equipment_id, equipment_name, quantity )
        `)
        .eq('user_id', user.id) // Filter bookings for the current user
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      // Cast: the generated Supabase types predate hold_expires_at (added by the
      // W1 availability schema migration), so the select parser rejects it.
      return (data || []) as unknown as CustomerBooking[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch delivery tasks for customer's bookings
  const { data: deliveryTasks = [] } = useQuery({
    queryKey: ['customer-delivery-tasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: bookingIds } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', user.id);
      
      if (!bookingIds || bookingIds.length === 0) return [];
      
      const { data: tasks, error } = await supabase
        .from('booking_service_tasks')
        .select(`
          id,
          booking_id,
          task_type,
          status,
          scheduled_for,
          eta_window_start,
          eta_window_end,
          public_tracking_token,
          completed_at,
          failure_reason
        `)
        .in('booking_id', bookingIds.map(b => b.id))
        .in('task_type', ['delivery', 'pickup'])
        .order('scheduled_for', { ascending: true });
      
      if (error) {
        console.error('Error fetching delivery tasks:', error);
        return [];
      }
      
      return (tasks || []) as DeliveryTaskWithSlip[];
    },
    enabled: !!user && bookings.length > 0,
    staleTime: 60 * 1000, // 1 minute
  });

  const getActiveDeliveries = () => {
    return deliveryTasks.filter(task => 
      !['completed', 'cancelled', 'failed'].includes(task.status) && 
      task.public_tracking_token
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <Header />
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="mb-8 font-display text-2xl font-semibold sm:text-3xl">My Bookings</h1>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeDeliveries = getActiveDeliveries();

  return (
    <div className="min-h-screen bg-muted/20">
      <Header />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-1">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">My Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Track deliveries, manage your reservations, and view invoices.
          </p>
        </div>

        {/* Active Deliveries Section */}
        {activeDeliveries.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold sm:text-2xl">
              <Truck className="h-6 w-6 shrink-0" />
              Track Your Delivery
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeDeliveries.map((task) => (
                <Card key={task.id} className="overflow-hidden flex flex-col border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {getServiceTaskTypeLabel(task.task_type)}
                      </CardTitle>
                      <Badge className={getServiceTaskBadgeClassName(task.status)}>
                        {getServiceTaskStatusLabel(task.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-grow">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {task.eta_window_start && task.eta_window_end
                          ? formatTaskTimeRange(task.eta_window_start, task.eta_window_end)
                          : task.scheduled_for
                            ? formatTaskDateTime(task.scheduled_for)
                            : 'Not yet scheduled'}
                      </span>
                    </div>
                    {task.status === 'en_route' && (
                      <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                        Driver is on the way!
                      </div>
                    )}
                    {task.status === 'arrived' && (
                      <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Driver has arrived at your location.
                      </div>
                    )}
                    {task.public_tracking_token && (
                      <Link
                        to={`/track/${task.public_tracking_token}`}
                        target="_blank"
                        className="inline-flex items-center justify-center"
                      >
                        <Button className="w-full mt-2" size="sm">
                          <MapPin className="h-4 w-4 mr-2" />
                          Track Delivery
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {bookings.length === 0 && activeDeliveries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              You have no bookings yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bookings.map((booking: CustomerBooking) => (
              <Card key={booking.id} className="overflow-hidden flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">Booking #{booking.id.substring(0,8)}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                    <Badge className={getPaymentStatusColor(booking.payment_status)}>
                      {getPaymentStatusLabel(booking.payment_status)}
                    </Badge>
                    {booking.delivery_slot && (
                      <Badge variant="outline" className="text-xs">
                        {booking.delivery_slot}
                      </Badge>
                    )}
                  </div>
                  {booking.hold_expires_at &&
                    ['pending', 'pending_admin_review'].includes(booking.status) && (
                      new Date(booking.hold_expires_at) > new Date() ? (
                        <p className="text-xs text-amber-600">
                          Reserved for you until {format(new Date(booking.hold_expires_at), 'MMM d, h:mm a')}
                        </p>
                      ) : (
                        <p className="text-xs text-destructive">Reservation hold expired</p>
                      )
                    )}
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <div>
                    <p className="text-sm font-medium text-foreground">Dates:</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Total Amount:</p>
                    <p className="text-sm text-muted-foreground">${booking.total_amount?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Items:</p>
                    {booking.booking_items && booking.booking_items.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {booking.booking_items.map((item: CustomerBookingItem, index: number) => (
                          <li key={index}>{item.equipment_name} (x{item.quantity})</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No items in this booking.</p>
                    )}
                  </div>
                  {booking.customer_comment && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Comments:</p>
                      <p className="text-sm text-gray-600">{booking.customer_comment}</p>
                    </div>
                  )}
                </CardContent>
                <div className="px-6 pb-6 space-y-3">
                  <BookingSelfServiceActions
                    bookingId={booking.id}
                    status={booking.status}
                    startDate={booking.start_date}
                    endDate={booking.end_date}
                    items={booking.booking_items ?? []}
                  />
                  {isSuccessfulBookingPaymentStatus(booking.payment_status) && (
                    <Link
                      to={`/invoice/${booking.id}`}
                      className="block text-sm font-medium text-primary hover:underline"
                    >
                      View Invoice
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
