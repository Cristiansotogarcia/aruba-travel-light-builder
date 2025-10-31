import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Package, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { BookingConfirmationModal } from './BookingConfirmationModal';

interface PendingReservation {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_comment: string | null;
  start_date: string;
  end_date: string;
  delivery_slot: 'morning' | 'afternoon';
  total_amount: number;
  created_at: string;
  items: Array<{
    equipment_name: string;
    quantity: number;
    equipment_price: number;
    subtotal: number;
  }>;
}

export const PendingReservations = () => {
  const [reservations, setReservations] = useState<PendingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<PendingReservation | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPendingReservations();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('pending_reservations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: 'status=eq.pending_admin_review'
        },
        () => {
          fetchPendingReservations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPendingReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch pending reservations
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'pending_admin_review')
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch booking items for each reservation
      const reservationsWithItems = await Promise.all(
        (bookings || []).map(async (booking: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('booking_items')
            .select('equipment_name, quantity, equipment_price, subtotal')
            .eq('booking_id', booking.id);

          if (itemsError) {
            console.error('Error fetching items for booking:', itemsError);
          }

          return { 
            ...booking, 
            items: items || [],
            delivery_slot: (booking.delivery_slot || 'morning') as 'morning' | 'afternoon'
          };
        })
      );

      setReservations(reservationsWithItems);
    } catch (err) {
      console.error('Error fetching pending reservations:', err);
      setError('Failed to load pending reservations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (reservation: PendingReservation) => {
    setSelectedReservation(reservation);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReservation(null);
  };

  const handleConfirmationComplete = () => {
    fetchPendingReservations();
    handleCloseModal();
  };

  const getDeliverySlotLabel = (slot: string) => {
    return slot === 'morning' ? 'Morning (9AM - 12PM)' : 'Afternoon (1PM - 5PM)';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-lg">Loading pending reservations...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (reservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Reservations</CardTitle>
          <CardDescription>No reservations awaiting review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">All caught up!</p>
            <p className="text-gray-600 mt-2">There are no pending reservations to review.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Reservations</CardTitle>
              <CardDescription>
                {reservations.length} reservation{reservations.length !== 1 ? 's' : ''} awaiting review
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {reservations.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <Card key={reservation.id} className="border-2 border-orange-200 bg-orange-50/50">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <User className="h-5 w-5" />
                          {reservation.customer_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Submitted {formatDateTime(reservation.created_at)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        Pending Review
                      </Badge>
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">{reservation.customer_email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">{reservation.customer_phone}</span>
                      </div>
                      {reservation.customer_address && (
                        <div className="flex items-center gap-2 text-sm md:col-span-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">{reservation.customer_address}</span>
                        </div>
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Delivery Date
                        </p>
                        <p className="text-sm text-gray-900">{formatDate(reservation.start_date)}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {getDeliverySlotLabel(reservation.delivery_slot)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Pickup Date
                        </p>
                        <p className="text-sm text-gray-900">{formatDate(reservation.end_date)}</p>
                      </div>
                    </div>

                    {/* Equipment Items */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Equipment ({reservation.items.length} item{reservation.items.length !== 1 ? 's' : ''})
                      </p>
                      <div className="bg-white rounded-lg p-3 space-y-2">
                        {reservation.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">
                              {item.equipment_name} <span className="text-gray-500">x{item.quantity}</span>
                            </span>
                            <span className="font-medium text-gray-900">
                              ${item.subtotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-gray-200">
                          <span>Total</span>
                          <span className="text-primary">${reservation.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Comment */}
                    {reservation.customer_comment && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-900 mb-1">Customer Note:</p>
                        <p className="text-sm text-blue-800">{reservation.customer_comment}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => handleOpenModal(reservation)}
                        className="flex-1"
                        size="lg"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Review & Confirm
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {selectedReservation && showModal && (
        <BookingConfirmationModal
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onComplete={handleConfirmationComplete}
        />
      )}
    </>
  );
};
