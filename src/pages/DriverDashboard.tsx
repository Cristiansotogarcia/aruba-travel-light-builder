import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardDescription, CardFooter, CardHeader, CardTitle
import { Button } from '@/components/ui/button';
// import { toast } from 'sonner'; // Removed unused toast from sonner
import { BookingStatus } from '@/components/admin/calendar/types'; // Removed Booking as it's not used
import { getStatusColor } from '@/components/admin/calendar/statusUtils';
import { Badge } from '@/components/ui/badge';
import { Check, MapPin, Clock } from 'lucide-react'; // Removed AlertCircle, CheckCircle2, Truck, XCircle
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Define interface for delivery data
interface DriverDelivery {
  id: string;
  customer_address: string | null; // Delivery address
  start_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'out_for_delivery' | 'delivered' | 'undeliverable';
  assigned_to: string | null; // The ID of the assigned driver
  customer_name: string | null;
  customer_email: string | null;
  notes?: string | null; // Added optional notes based on usage
}

const DriverDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast(); // This toast is used
  const queryClient = useQueryClient();

  const { data: deliveries = [] } = useQuery({
    queryKey: ['driver-bookings-today', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_address,
          start_date,
          status,
          assigned_to,
          customer_name,
          customer_email
        `)
        .eq('start_date', today)
        .eq('assigned_to', user.id)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as DriverDelivery[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-bookings-today'] });
      toast({
        title: 'Booking status updated',
        description: 'The booking has been marked as completed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating booking status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header /> {/* Changed Navigation to Header */}
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Today's Deliveries</h1>
        
        {deliveries && deliveries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-600">
              No deliveries scheduled for today.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery: DriverDelivery) => (
              <Card key={delivery.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">
                          {delivery.customer_name || delivery.customer_email || 'Unknown Customer'}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(delivery.status as BookingStatus)}>
                            {delivery.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {delivery.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => toggleStatusMutation.mutate(delivery.id)}
                          disabled={toggleStatusMutation.isPending}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark Done
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{delivery.customer_address}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <p className="text-sm text-gray-600">{delivery.start_date}</p>
                      </div>
                    </div>
                    
                    {delivery.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Notes:</p>
                        <p className="text-sm text-gray-600">{delivery.notes}</p>
                      </div>
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

export default DriverDashboard;