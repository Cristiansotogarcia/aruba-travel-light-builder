import { useQuery } from '@tanstack/react-query'; // Removed useMutation and useQueryClient
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';

import { Header } from '@/components/layout/Header'; // Changed Navigation to Header
import { useAuth } from '@/hooks/useAuth';
// import { useToast } from '@/hooks/use-toast'; // Removed unused import

// Assuming a similar structure to DriverToday, but for Booker
const BookerDashboard = () => {
  const { user } = useAuth();
  // const { toast } = useToast(); // Removed unused variable
  // const queryClient = useQueryClient(); // Removed unused variable

  // Example: Fetch bookings assigned to this booker or all bookings if admin/booker role
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['booker-bookings', user?.id], // Differentiate queryKey from driver
    queryFn: async () => {
      if (!user) return [];
      
      // Adjust the query based on what a Booker needs to see
      // This is a placeholder and needs to be adapted to your actual schema and logic
      const { data, error } = await supabase
        .from('bookings') // Assuming 'bookings' table
        .select(`
          id,
          customer_name,
          customer_email,
          start_date,
          end_date,
          total_amount,
          status,
          booking_items ( equipment_name, quantity )
        `)
        // Add filters if necessary, e.g., by status or date range
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Example: Mutation to update booking status (e.g., confirm, cancel)
  // const updateBookingStatusMutation = useMutation({
  //   mutationFn: async ({ bookingId, newStatus }: { bookingId: string, newStatus: string }) => {
  //     const { error } = await supabase
  //       .from('bookings')
  //       .update({ status: newStatus })
  //       .eq('id', bookingId);
      
  //     if (error) throw error;
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['booker-bookings'] });
  //     toast({
  //       title: 'Booking status updated',
  //       description: 'The booking status has been successfully updated.',
  //     });
  //   },
  //   onError: (error: Error) => {
  //     toast({
  //       title: 'Error updating booking status',
  //       description: error.message,
  //       variant: 'destructive',
  //     });
  //   },
  // });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default'; // Green or similar for positive status
      case 'pending':
        return 'secondary'; // Yellow or similar for pending
      case 'cancelled':
        return 'destructive'; // Red for negative status
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Booker Dashboard</h1>
        
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-600">
              No bookings found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking: any) => (
              <Card key={booking.id} className="overflow-hidden flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">Booking #{booking.id.substring(0,8)}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(booking.status)} className="w-fit">
                    {booking.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Customer:</p>
                    <p className="text-sm text-gray-600">{booking.customer_name} ({booking.customer_email})</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Dates:</p>
                    <p className="text-sm text-gray-600">{new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Amount:</p>
                    <p className="text-sm text-gray-600">${booking.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Items:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {booking.booking_items.map((item: any, index: number) => (
                        <li key={index}>{item.equipment_name} (x{item.quantity})</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                {/* Add action buttons if needed, e.g., to confirm or cancel bookings */}
                {/* Example:
                <div className="p-4 border-t">
                  {booking.status === 'pending' && (
                    <Button 
                      onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, newStatus: 'confirmed' })}
                      disabled={updateBookingStatusMutation.isPending}
                      className="mr-2"
                    >
                      Confirm Booking
                    </Button>
                  )}
                  {booking.status !== 'cancelled' && (
                     <Button 
                      variant="destructive"
                      onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, newStatus: 'cancelled' })}
                      disabled={updateBookingStatusMutation.isPending}
                    >
                      Cancel Booking
                    </Button>
                  )}
                </div>
                */}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookerDashboard;