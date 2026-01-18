
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Users, Package, FileText, Clock, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getStatusColor, getStatusLabel } from './calendar/statusUtils';
import type { Database } from '@/types/supabase';

interface DashboardStats {
  totalBookings: number;
  pendingReviews: number;
  pendingPayments: number;
  totalRevenue: number;
  uniqueCustomers: number;
}

type BookingRow = Database['public']['Tables']['bookings']['Row'];

interface AdminDashboardProps {
  onNavigate?: (section: string) => void;
}

export const AdminDashboard = ({ onNavigate }: AdminDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingReviews: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    uniqueCustomers: 0,
  });
  const [recentBookings, setRecentBookings] = useState<BookingRow[]>([]);
  const [pendingPayments, setPendingPayments] = useState<BookingRow[]>([]);
  const [recentPaidBookings, setRecentPaidBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');

      if (bookingsError) throw bookingsError;

      // Calculate stats
      const totalBookings = bookings?.length || 0;
      const pendingReviews = bookings?.filter(b => b.status === 'pending_admin_review').length || 0;
      const pendingPayments = bookings?.filter(
        b => b.status === 'pending' && b.payment_status !== 'paid'
      ).length || 0;
      const totalRevenue = bookings
        ?.filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;
      const uniqueCustomers = new Set(bookings?.map(b => b.customer_email)).size || 0;

      setStats({
        totalBookings,
        pendingReviews,
        pendingPayments,
        totalRevenue,
        uniqueCustomers,
      });

      // Get recent bookings
      const recentBookingsData = bookings
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5) || [];

      setRecentBookings(recentBookingsData);

      const pendingPaymentData = bookings
        ?.filter(b => b.status === 'pending' && b.payment_status !== 'paid')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5) || [];

      setPendingPayments(pendingPaymentData);

      const paidBookings = bookings
        ?.filter(b => b.payment_status === 'paid')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5) || [];

      setRecentPaidBookings(paidBookings);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (section: string, bookingId?: string) => {
    if (bookingId) {
      sessionStorage.setItem('admin:openBookingId', bookingId);
    }
    onNavigate?.(section);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                  <div className="animate-pulse">
                  <div className="h-4 bg-muted/60 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted/60 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your rentals.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalBookings}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingReviews}</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingPayments}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold text-foreground">{stats.uniqueCustomers}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bookings</p>
                <p className="text-xl font-semibold">{stats.totalBookings}</p>
              </div>
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <Button onClick={() => handleNavigate('bookings')} className="w-full" variant="outline">
              View Bookings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-xl font-semibold">{stats.pendingReviews}</p>
              </div>
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <Button onClick={() => handleNavigate('pending-reservations')} className="w-full" variant="outline">
              Review Requests
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invoices</p>
                <p className="text-xl font-semibold">{recentPaidBookings.length}</p>
              </div>
              <FileText className="h-6 w-6 text-emerald-600" />
            </div>
            <Button onClick={() => handleNavigate('invoices')} className="w-full" variant="outline">
              Open Invoices
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Analytics</p>
                <p className="text-xl font-semibold">Reports</p>
              </div>
              <ArrowUpRight className="h-6 w-6 text-indigo-600" />
            </div>
            <Button onClick={() => handleNavigate('reports')} className="w-full" variant="outline">
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border border-border/60 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                      <p className="font-bold text-foreground">${Number(booking.total_amount).toFixed(2)}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleNavigate('bookings', booking.id)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No bookings yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPayments.length > 0 ? (
              pendingPayments.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between border border-border/60 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{booking.customer_name}</p>
                    <p className="text-xs text-muted-foreground">${Number(booking.total_amount).toFixed(2)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleNavigate('bookings', booking.id)}
                  >
                    Review
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No pending payments.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentPaidBookings.length > 0 ? (
            recentPaidBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 border border-border/60 rounded-xl">
                <div>
                  <p className="font-medium text-foreground">Invoice #{booking.id.substring(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">${Number(booking.total_amount).toFixed(2)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/invoice/${booking.id}`, '_blank')}
                  >
                    View Invoice
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">No invoices generated yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
