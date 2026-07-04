
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Users, Package, FileText, Clock, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getStatusColor, getStatusLabel } from './calendar/statusUtils';
import type { Database } from '@/types/supabase';
import { getInvoiceDisplayNumber, isSuccessfulBookingPaymentStatus } from '@/lib/accounting/invoices';

interface DashboardStats {
  totalBookings: number;
  pendingReviews: number;
  pendingPayments: number;
  totalRevenue: number;
  uniqueCustomers: number;
  totalInvoices: number;
}

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type InvoiceRow = Pick<
  Database['public']['Tables']['invoices']['Row'],
  'customer_email' | 'id' | 'invoice_number' | 'issued_at' | 'total_amount'
>;

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
    totalInvoices: 0,
  });
  const [recentBookings, setRecentBookings] = useState<BookingRow[]>([]);
  const [pendingPayments, setPendingPayments] = useState<BookingRow[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time changes
    const bookingsSubscription = supabase
      .channel('admin-dashboard-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const paymentSubscription = supabase
      .channel('admin-dashboard-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_records' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const auditSubscription = supabase
      .channel('admin-dashboard-audit')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_audit_log' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSubscription);
      supabase.removeChannel(paymentSubscription);
      supabase.removeChannel(auditSubscription);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');

      if (bookingsError) throw bookingsError;

      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('customer_email, id, invoice_number, issued_at, total_amount')
        .order('issued_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Calculate stats
      const totalBookings = bookings?.length || 0;
      const pendingReviews = bookings?.filter(b => b.status === 'pending_admin_review').length || 0;
      const pendingPayments = bookings?.filter(
        b => b.status === 'pending' && !isSuccessfulBookingPaymentStatus(b.payment_status)
      ).length || 0;
      const totalRevenue = invoices
        ?.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0) || 0;
      const uniqueCustomers = new Set(bookings?.map(b => b.customer_email)).size || 0;
      const totalInvoices = invoices?.length || 0;

      setStats({
        totalBookings,
        pendingReviews,
        pendingPayments,
        totalRevenue,
        uniqueCustomers,
        totalInvoices,
      });

      // Get recent bookings
      const recentBookingsData = bookings
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5) || [];

      setRecentBookings(recentBookingsData);

      const pendingPaymentData = bookings
        ?.filter(b => b.status === 'pending' && !isSuccessfulBookingPaymentStatus(b.payment_status))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5) || [];

      setPendingPayments(pendingPaymentData);

      const invoiceRows = invoices
        ?.sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
        .slice(0, 5) || [];

      setRecentInvoices(invoiceRows);
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

  const overviewCards = [
    {
      title: 'Bookings',
      value: stats.totalBookings.toLocaleString(),
      description: 'All reservations across every status',
      actionLabel: 'Open Bookings',
      section: 'bookings',
      icon: Calendar,
      iconWrapperClassName: 'bg-blue-100',
      iconClassName: 'text-blue-600',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews.toLocaleString(),
      description: 'Reservations waiting for approval',
      actionLabel: 'Review Requests',
      section: 'pending-reservations',
      icon: Clock,
      iconWrapperClassName: 'bg-amber-100',
      iconClassName: 'text-amber-600',
    },
    {
      title: 'Pending Payments',
      value: stats.pendingPayments.toLocaleString(),
      description: 'Bookings that still need payment',
      actionLabel: 'Open Bookings',
      section: 'bookings',
      icon: Package,
      iconWrapperClassName: 'bg-orange-100',
      iconClassName: 'text-orange-600',
    },
    {
      title: 'Invoices',
      value: stats.totalInvoices.toLocaleString(),
      description: 'Issued invoices ready to review',
      actionLabel: 'Open Invoices',
      section: 'invoices',
      icon: FileText,
      iconWrapperClassName: 'bg-emerald-100',
      iconClassName: 'text-emerald-600',
    },
    {
      title: 'Revenue',
      value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: 'Total invoiced revenue collected',
      actionLabel: 'View Reports',
      section: 'reports',
      icon: DollarSign,
      iconWrapperClassName: 'bg-green-100',
      iconClassName: 'text-green-600',
    },
    {
      title: 'Customers',
      value: stats.uniqueCustomers.toLocaleString(),
      description: 'Unique customers with bookings',
      actionLabel: 'Open Customers',
      section: 'customers',
      icon: Users,
      iconWrapperClassName: 'bg-purple-100',
      iconClassName: 'text-purple-600',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted/60 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted/60 rounded w-3/4"></div>
                  <div className="h-3 bg-muted/60 rounded w-full"></div>
                  <div className="h-8 bg-muted/60 rounded w-full"></div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} className="border-border/60">
              <CardContent className="flex h-full flex-col gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconWrapperClassName}`}>
                    <Icon className={`h-5 w-5 ${card.iconClassName}`} />
                  </div>
                </div>

                <Button
                  onClick={() => handleNavigate(card.section)}
                  className="mt-auto h-8 w-full justify-between text-xs font-semibold"
                  variant="secondary"
                >
                  {card.actionLabel}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
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
          {recentInvoices.length > 0 ? (
            recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border border-border/60 rounded-xl">
                <div>
                  <p className="font-medium text-foreground">
                    Invoice #{getInvoiceDisplayNumber(invoice.invoice_number, invoice.id)}
                  </p>
                  <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">${Number(invoice.total_amount).toFixed(2)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/invoice/${invoice.id}`, '_blank')}
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
