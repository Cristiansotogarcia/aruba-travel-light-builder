import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Clock, CreditCard, LayoutDashboard, PackageCheck, UserCheck, UserPlus } from 'lucide-react';

import { BookingAssignment } from '@/components/admin/BookingAssignment';
import { PendingReservations } from '@/components/admin/PendingReservations';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { AppShell, type AppNavEntry } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookingListSkeleton, DashboardStatsSkeleton } from '@/components/common/SkeletonLoader';
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

const STORAGE_KEY = 'booker:activeSection';

const BOOKER_NAV: AppNavEntry[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'review', label: 'Pending Reservations', icon: Clock },
  { id: 'assignments', label: 'Assignments', icon: UserPlus },
];

const STAT_META: Record<string, { label: string; description: string }> = {
  overview: { label: 'Overview', description: 'Review new reservations, track payment handoffs, and assign drivers.' },
  review: { label: 'Pending Reservations', description: 'Approve or decline reservations awaiting review.' },
  assignments: { label: 'Assignments', description: 'Match confirmed bookings with available drivers.' },
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof ClipboardCheck;
  tone: string;
}) => (
  <Card>
    <CardContent className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
      <Icon className={`h-8 w-8 shrink-0 ${tone}`} />
    </CardContent>
  </Card>
);

const BookerDashboard = () => {
  const [activeSection, setActiveSection] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) || 'overview'
  );

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, activeSection);
  }, [activeSection]);

  const nav = useMemo(() => BOOKER_NAV, []);

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

  const renderOverview = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <DashboardStatsSkeleton />
          <BookingListSkeleton count={4} />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pending Review" value={pendingReviewCount} icon={ClipboardCheck} tone="text-orange-600" />
          <StatCard label="Awaiting Payment" value={pendingPaymentCount} icon={CreditCard} tone="text-amber-600" />
          <StatCard label="Ready to Assign" value={readyToAssignCount} icon={UserCheck} tone="text-blue-600" />
          <StatCard label="Assigned Work" value={assignedCount} icon={PackageCheck} tone="text-emerald-600" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Operational Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookings.slice(0, 8).map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-foreground">{booking.customer_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{booking.customer_email}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:text-right">
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
              <p className="py-8 text-center text-muted-foreground">No bookings available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'review':
        return <PendingReservations />;
      case 'assignments':
        return <BookingAssignment />;
      case 'overview':
      default:
        return renderOverview();
    }
  };

  const meta = STAT_META[activeSection] ?? STAT_META.overview;

  return (
    <AppShell
      panelName="Booker Workspace"
      nav={nav}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      headerAccessory={<NotificationBell />}
      pageTitle={meta.label}
      pageDescription={meta.description}
    >
      {renderSection()}
    </AppShell>
  );
};

export default BookerDashboard;
