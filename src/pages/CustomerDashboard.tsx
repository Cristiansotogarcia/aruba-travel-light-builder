
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header'; // Changed to named import
import { useAuth } from '@/hooks/useAuth';

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
          booking_items ( equipment_name, quantity )
        `)
        .eq('user_id', user.id) // Filter bookings for the current user
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'default'; // Changed from 'success' to 'default'
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header /> 
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Bookings</h1>
        
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-600">
              You have no bookings yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking: any) => (
              <Card key={booking.id} className="overflow-hidden flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">Booking #{booking.id.substring(0,8)}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(booking.status)} className="w-fit capitalize">
                    {booking.status || 'Unknown'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Dates:</p>
                    <p className="text-sm text-gray-600">
                      {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Amount:</p>
                    <p className="text-sm text-gray-600">${booking.total_amount?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Items:</p>
                    {booking.booking_items && booking.booking_items.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {booking.booking_items.map((item: any, index: number) => (
                          <li key={index}>{item.equipment_name} (x{item.quantity})</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">No items in this booking.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
