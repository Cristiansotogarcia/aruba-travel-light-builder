
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, Calendar, Package, Edit, Eye, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { EditCustomerModal } from './EditCustomerModal';
import { getStatusColor } from '../calendar/statusUtils';

import { Booking } from '../calendar/types';

interface Customer {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  bookings: Booking[];
  total_spent: number;
  last_booking: string;
}

interface CustomerDetailsModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCustomerUpdated: () => void;
  onNavigateToBooking?: (bookingId: string) => void;
}

export const CustomerDetailsModal = ({ 
  open, 
  onClose, 
  customer, 
  onCustomerUpdated,
  onNavigateToBooking 
}: CustomerDetailsModalProps) => {
  const [showBookings, setShowBookings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer) {
      setBookings(customer.bookings);
    }
  }, [customer]);

  const fetchBookingDetails = async () => {
    if (!customer) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          booking_items (
            id,
            equipment_id,
            quantity,
            equipment_price,
            subtotal,
            equipment_name
          )
        `)
        .eq('customer_email', customer.customer_email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as Booking[]);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch booking details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewBookings = () => {
    setShowBookings(true);
    fetchBookingDetails();
  };

  const handleEditCustomer = () => {
    setShowEditModal(true);
  };

  const handleCustomerUpdated = () => {
    onCustomerUpdated();
    setShowEditModal(false);
  };

  const isCurrentBooking = (booking: Booking) => {
    const today = new Date();
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    return today >= startDate && today <= endDate;
  };

  if (!customer) return null;

  return (
    <>
      <Dialog open={open && !showBookings} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <div className="text-lg font-semibold">{customer.customer_name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </label>
                    <div className="text-sm">{customer.customer_email}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone
                    </label>
                    <div className="text-sm">{customer.customer_phone}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Address
                    </label>
                    <div className="text-sm">{customer.customer_address}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{customer.bookings.length}</div>
                    <div className="text-sm text-gray-500">Total Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">${customer.total_spent}</div>
                    <div className="text-sm text-gray-500">Total Spent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">Last Booking</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(customer.last_booking), 'dd/MM/yyyy')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleViewBookings} className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                View Bookings
              </Button>
              <Button variant="outline" onClick={handleEditCustomer} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bookings List Modal */}
      <Dialog open={showBookings} onOpenChange={() => setShowBookings(false)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bookings for {customer.customer_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading bookings...</div>
            ) : bookings.length > 0 ? (
              bookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                        {isCurrentBooking(booking) && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">${booking.total_amount}</div>
                        <div className="text-xs text-gray-500">
                          #{booking.id.substring(0, 8)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Period:
                        </span>
                        <div className="font-medium">
                          {format(new Date(booking.start_date), 'dd/MM/yyyy')} - {format(new Date(booking.end_date), 'dd/MM/yyyy')}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <div className="font-medium">
                          {format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>

                    {booking.booking_items && booking.booking_items.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Equipment:</div>
                        <div className="space-y-1">
                          {booking.booking_items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                              <span>{item.equipment_name} × {item.quantity}</span>
                              <span>${item.subtotal}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isCurrentBooking(booking) && onNavigateToBooking && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onNavigateToBooking(booking.id);
                          setShowBookings(false);
                          onClose();
                        }}
                        className="w-full"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        View in Bookings List
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No bookings found for this customer.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EditCustomerModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        customer={customer}
        onCustomerUpdated={handleCustomerUpdated}
      />
    </>
  );
};
