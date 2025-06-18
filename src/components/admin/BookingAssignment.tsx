
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
// import { mockDeliveryPersonnel } from '@/data/mockDeliveryPersonnel'; // Removed this line
import { Booking } from './calendar/types';
import { getStatusColor } from './calendar/statusUtils';

/* // Removed this interface
interface BookingAssignmentProps {
  bookings: Booking[];
  onAssign: (bookingId: string, personnelId: string) => void;
}
*/

interface Driver {
  id: string;
  name: string;
}

export const BookingAssignment = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (hasPermission('BookingAssignment')) {
      fetchBookings();
      fetchDrivers();
    }
  }, [hasPermission]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          booking_items (*)
        `)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      const bookingsWithDefaults = data ? data.map(b => ({ ...b, booking_items: b.booking_items || [] })) : [];
      setBookings(bookingsWithDefaults as Booking[]);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'Driver');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const assignBooking = async (bookingId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ assigned_to: driverId })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(prev =>
        prev.map(booking =>
          booking.id === bookingId
            ? { ...booking, assigned_to: driverId, booking_items: booking.booking_items || [] } // Ensure booking_items default here too
            : booking
        )
      );

      toast({
        title: "Success",
        description: "Booking assigned successfully",
      });
    } catch (error) {
      console.error('Error assigning booking:', error);
      toast({
        title: "Error",
        description: "Failed to assign booking",
        variant: "destructive",
      });
    }
  };

  if (!hasPermission('BookingAssignment')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to access booking assignment.</p>
      </div>
    );
  }

  const unassignedBookings = bookings.filter(booking => !booking.assigned_to);
  const myAssignments = profile?.role === 'Booker' 
    ? bookings.filter(booking => booking.assigned_to === profile.id)
    : [];

  return (
    <LoadingState isLoading={loading} message="Loading bookings...">
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Booking Assignment</h1>
        <p className="text-gray-600 mt-1">Assign bookings to drivers for delivery and pickup</p>
      </div>

      {/* Unassigned Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Unassigned Bookings ({unassignedBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {unassignedBookings.length > 0 ? (
              unassignedBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{booking.customer_name}</h3>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {booking.customer_address}
                      </div>
                      <span className="font-medium">${booking.total_amount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select onValueChange={(driverId) => assignBooking(booking.id, driverId)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Assign driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map(driver => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No unassigned bookings</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Assignments (for Bookers) */}
      {profile?.role === 'Booker' && (
        <Card>
          <CardHeader>
            <CardTitle>My Assignments ({myAssignments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myAssignments.length > 0 ? (
                myAssignments.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-blue-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{booking.customer_name}</h3>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {booking.customer_address}
                        </div>
                        <span className="font-medium">${booking.total_amount}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No assignments yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </LoadingState>
  );
};
