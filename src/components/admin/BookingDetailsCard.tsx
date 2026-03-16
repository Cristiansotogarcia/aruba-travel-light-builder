import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, User, Phone, MapPin, Package, AlertTriangle, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusColor, getStatusLabel } from './calendar/statusUtils';
import { Booking } from './calendar/types';
import { isSuccessfulBookingPaymentStatus } from '@/lib/accounting/invoices';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { buildDriverAssignmentUpdate } from '@/lib/operations/bookingOperations';

interface Driver {
  id: string;
  name: string;
  email: string | null;
}

interface BookingDetailsCardProps {
  booking: Booking;
  onDriverAssigned?: () => void;
}

export const BookingDetailsCard = ({ booking, onDriverAssigned }: BookingDetailsCardProps) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('role', 'Driver')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching drivers:', error);
        } else {
          setDrivers(data || []);
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
      } finally {
        setLoadingDrivers(false);
      }
    };

    fetchDrivers();
  }, []);

  const handleDriverChange = async (driverId: string) => {
    if (!driverId || driverId === 'unassign') {
      return;
    }

    try {
      const driver = drivers.find(d => d.id === driverId);
      if (!driver) {
        throw new Error('Driver not found');
      }

      const assignmentUpdate = buildDriverAssignmentUpdate(driverId, {
        deliveryScheduledAt: booking.delivery_scheduled_at ?? booking.start_date,
        pickupScheduledAt: booking.pickup_scheduled_at ?? booking.end_date,
      });

      const { error } = await supabase
        .from('bookings')
        .update(assignmentUpdate)
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: 'Driver Assigned',
        description: `Booking assigned to ${driver.name}`,
      });

      onDriverAssigned?.();
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign driver',
        variant: 'destructive',
      });
    }
  };

  const currentDriverId = booking.assigned_driver_id ?? booking.assigned_to;
  const currentDriverName = currentDriverId 
    ? drivers.find(d => d.id === currentDriverId)?.name 
    : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Status and Dates */}
        <div className="flex justify-between items-start">
          <div>
            <Badge className={getStatusColor(booking.status)}>
              {getStatusLabel(booking.status)}
            </Badge>
            <div className="flex items-center gap-2 mt-3 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(booking.start_date), 'dd/MM/yyyy')} - {format(new Date(booking.end_date), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${Number(booking.total_amount).toFixed(2)}</div>
            <div className="text-sm text-gray-500">Total Amount</div>
            <div className="mt-2 text-xs text-gray-500 uppercase tracking-wide">Payment Status</div>
            <div className="text-sm font-semibold text-gray-900">
              {isSuccessfulBookingPaymentStatus(booking.payment_status) ? 'Paid' : 'Pending'}
            </div>
          </div>
        </div>

        {/* Delivery Failure Alert - Only show for undeliverable bookings */}
        {booking.status === 'undeliverable' && booking.delivery_failure_reason && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Delivery Failed:</strong> {booking.delivery_failure_reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Customer Information */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>
              <div className="font-medium">{booking.customer_name}</div>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>
              <div className="font-medium">{booking.customer_email}</div>
            </div>
            <div>
              <span className="text-gray-500 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Phone:
              </span>
              <div className="font-medium">{booking.customer_phone}</div>
            </div>
            <div>
              <span className="text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Accommodation:
              </span>
              <div className="font-medium">{booking.customer_address}</div>
            </div>
            {booking.room_number && (
              <div>
                <span className="text-gray-500">Room Number:</span>
                <div className="font-medium">{booking.room_number}</div>
              </div>
            )}
          </div>
        </div>
        {booking.customer_comment && (
          <div className="mt-4">
            <h3 className="font-semibold mb-1">Customer Comments</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.customer_comment}</p>
          </div>
        )}

        {/* Driver Assignment */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Driver Assignment
          </h3>
          <div className="flex items-center gap-4">
            <Select 
              value={currentDriverId || ''} 
              onValueChange={handleDriverChange}
              disabled={loadingDrivers}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder={loadingDrivers ? "Loading drivers..." : "Select a driver"} />
              </SelectTrigger>
              <SelectContent>
                {drivers.length === 0 && !loadingDrivers && (
                  <div className="p-2 text-sm text-gray-500 text-center">No drivers available</div>
                )}
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentDriverName && (
              <Badge variant="outline" className="bg-blue-50">
                Currently assigned: {currentDriverName}
              </Badge>
            )}
          </div>
        </div>

        {/* Equipment Items */}
        {booking.booking_items && booking.booking_items.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipment Items
            </h3>
            <div className="space-y-2">
              {booking.booking_items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{item.equipment_name}</div>
                    <div className="text-sm text-gray-500">
                      ${item.equipment_price}/day × {item.quantity} items
                    </div>
                  </div>
                  <div className="font-bold">${item.subtotal}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};