import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, CreditCard, PackageCheck, UserCheck } from 'lucide-react';

import { BookingAssignment } from '@/components/admin/BookingAssignment';
import { PendingReservations } from '@/components/admin/PendingReservations';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { isSuccessfulBookingPaymentStatus } from '@/lib/accounting/invoices';
import { DRIVER_ASSIGNABLE_STATUSES, getAssignedDriverId } from '@/lib/operations/bookingOperations';

interface BookerBookingItem {
  equipment_name: string;
  quantity: number;
}

interface BookerBooking {
  id: string;
  assigned_driver_id: string | null;
  assigned_to: string | null;
  customer_email: string;
  customer_name: string;
  end_date: string;
  payment_status: string | null;
  start_date: string;
  status: string;
  total_amount: number;
  booking_items: BookerBookingItem[];
}

const BookerDashboard = () => {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['booker-workspace-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          assigned_driver_id,
          assigned_to,
          customer_email,
          customer_name,
          end_date,
          payment_status,
          start_date,
          status,
          total_amount,
          booking_items ( equipment_name, quantity )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as BookerBooking[];
    },
    staleTime: 60 * 1000,
  });

  const pendingReviewCount = bookings.filter((booking) => booking.status === 'pending_admin_review').length;
  const pendingPaymentCount = bookings.filter(
    (booking) => booking.status === 'pending' && !isSuccessfulBookingPaymentStatus(booking.payment_status)
  ).length;
  const readyToAssignCount = bookings.filter(
    (booking) => DRIVER_ASSIGNABLE_STATUSES.includes(booking.status as (typeof DRIVER_ASSIGNABLE_STATUSES)[number]) && !getAssignedDriverId(booking)
  ).length;
  const assignedCount = bookings.filter(
    (booking) => DRIVER_ASSIGNABLE_STATUSES.includes(booking.status as (typeof DRIVER_ASSIGNABLE_STATUSES)[number]) && Boolean(getAssignedDriverId(booking))
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading booker workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Booker Workspace</h1>
          <p className="text-muted-foreground mt-1">Review new reservations, track payment handoffs, and assign drivers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-semibold">{pendingReviewCount}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-orange-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Payment</p>
                <p className="text-2xl font-semibold">{pendingPaymentCount}</p>
              </div>
              <CreditCard className="h-8 w-8 text-amber-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Assign</p>
                <p className="text-2xl font-semibold">{readyToAssignCount}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned Work</p>
                <p className="text-2xl font-semibold">{assignedCount}</p>
              </div>
              <PackageCheck className="h-8 w-8 text-emerald-600" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="review">Pending Reservations</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Operational Bookings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bookings.slice(0, 8).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant="outline" className="capitalize">
                        {booking.status.replace(/_/g, ' ')}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Payment {isSuccessfulBookingPaymentStatus(booking.payment_status) ? 'Paid' : 'Pending'}
                      </p>
                      <p className="font-semibold text-foreground">${Number(booking.total_amount).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {bookings.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No bookings available yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review">
            <PendingReservations />
          </TabsContent>

          <TabsContent value="assignments">
            <BookingAssignment />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BookerDashboard;
