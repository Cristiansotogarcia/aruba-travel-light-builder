
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateBookingModal } from './CreateBookingModal';
import { CompactEditBookingModal } from './CompactEditBookingModal';
import { BookingViewModal } from './BookingViewModal';
import { BookingCalendarView } from './BookingCalendarView';
import { BookingFilters } from './BookingFilters';
import { BookingsListView } from './BookingsListView';
import Spinner from '@/components/common/Spinner'; // Added Spinner import

import { Booking, BookingStatus } from './calendar/types'; // Removed BookingItem, kept BookingStatus
import { useQueryClient } from '@tanstack/react-query'; // Added import for useQueryClient

export const BookingsList = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showListView, setShowListView] = useState(false);
  const [calendarView, setCalendarView] = useState<'day' | 'week'>('week'); // Default to week view
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize queryClient

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          booking_items (
            equipment_name,
            quantity,
            equipment_price,
            subtotal,
            equipment_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Cast status to BookingStatus
      const typedBookings = data ? data.map(b => ({ ...b, status: b.status as BookingStatus })) : [];
      setBookings(typedBookings);
    } catch (error: unknown) {
      console.error('Error fetching bookings:', error);
      let description = 'Failed to fetch bookings.';
      const message = error instanceof Error ? error.message : '';
      const code = typeof (error as { code?: unknown }).code === 'string' ? (error as { code?: string }).code : '';
      if (message.includes('permission denied')) {
        description = "You do not have permission to view all bookings. Please contact an administrator if you believe this is an error.";
      } else if (code === 'PGRST116') { // Example: Supabase RLS violation code
        description = "Access to some bookings is restricted due to security policies.";
      }
      toast({
        title: "Error Fetching Bookings",
        description,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const filterBookings = useCallback(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    filterBookings();
  }, [filterBookings]);

  useEffect(() => {
    if (!bookings.length) return;
    const openBookingId = sessionStorage.getItem('admin:openBookingId');
    if (!openBookingId) return;
    const bookingToOpen = bookings.find((booking) => booking.id === openBookingId);
    if (bookingToOpen) {
      setViewingBooking(bookingToOpen);
      sessionStorage.removeItem('admin:openBookingId');
    }
  }, [bookings]);

  const updateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => { // Changed newStatus type
    try {
      const { data: updatedBooking, error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select('*, booking_items(equipment_name, quantity, equipment_price, subtotal, equipment_id)') // Select the updated booking details
        .single();

      if (error) {
        // toast.error(`Error updating booking status: ${error.message}`);
        toast({
          title: "Error Updating Status",
          description: `Error updating booking status: ${error.message}`,
          variant: "destructive"
        });
        console.error('Error updating booking status:', error);
        return;
      }

      // toast.success(`Booking ${bookingId} status updated to ${newStatus}`);
      toast({
        title: "Status Updated",
        description: `Booking ${bookingId} status updated to ${newStatus}`,
        // variant: "default" // Or remove for default success styling
      });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['driverBookings'] }); // Also invalidate driver bookings if applicable

      // Call the email notification function
      if (updatedBooking && updatedBooking.customer_email) {
        const equipmentDetails = updatedBooking.booking_items?.map(item => `${item.equipment_name} (x${item.quantity})`).join(', ') || 'N/A';
        const { error: functionError } = await supabase.functions.invoke('booking-status-update-email', {
          body: {
            customer_email: updatedBooking.customer_email,
            customer_name: updatedBooking.customer_name,
            booking_id: updatedBooking.id,
            new_status: newStatus,
            // old_status: could be passed if we fetch the booking before updating
            start_date: updatedBooking.start_date,
            equipment_details: equipmentDetails,
          },
        });

        if (functionError) {
          // toast.error(`Failed to send status update email: ${functionError.message}`);
          toast({
            title: "Email Error",
            description: `Failed to send status update email: ${functionError.message}`,
            variant: "destructive"
          });
          console.error('Error invoking email function:', functionError);
        }
      }

    } catch (err) {
      // toast.error('An unexpected error occurred while updating status.');
      toast({
        title: "Unexpected Error",
        description: 'An unexpected error occurred while updating status.',
        variant: "destructive"
      });
      console.error('Unexpected error in updateBookingStatus:', err);
    }
  };

  const confirmPaymentReceived = async (booking: Booking) => {
    try {
      const processedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          updated_at: processedAt
        })
        .eq('id', booking.id);

      if (updateError) {
        throw updateError;
      }

      const { error: paymentRecordError } = await supabase
        .from('payment_records')
        .insert({
          booking_id: booking.id,
          amount: booking.total_amount,
          currency: 'USD',
          status: 'paid',
          processed_at: processedAt
        });

      if (paymentRecordError) {
        console.error('Error creating payment record:', paymentRecordError);
      }

      try {
        await supabase.functions.invoke('send-invoice-email', {
          body: {
            booking_id: booking.id,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            total_amount: booking.total_amount,
            processed_at: processedAt,
            items: booking.booking_items || []
          }
        });
      } catch (emailError) {
        console.error('Failed to send invoice email:', emailError);
      }

      toast({
        title: "Payment Confirmed",
        description: "Invoice sent to the customer.",
      });

      fetchBookings();
    } catch (error: unknown) {
      console.error('Error confirming payment:', error);
      const message = error instanceof Error ? error.message : 'Failed to confirm payment.';
      toast({
        title: "Payment Confirmation Failed",
        description: message,
        variant: "destructive"
      });
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
  };

  const handleViewBooking = (booking: Booking) => {
    setViewingBooking(booking);
  };

  const handleCloseEdit = () => {
    setEditingBooking(null);
  };

  const handleCloseView = () => {
    setViewingBooking(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" message="Loading bookings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600 mt-1">Manage customer bookings and rental requests</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="text-lg px-3 py-1"
            onClick={() => setShowListView(true)}
          >
            {filteredBookings.length} bookings
          </Button>
          <CreateBookingModal onBookingCreated={fetchBookings} />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <BookingFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            showListView={showListView}
            onReturnToCalendar={() => setShowListView(false)}
            calendarView={calendarView}
            onCalendarViewChange={setCalendarView}
          />
        </CardContent>
      </Card>

      {showListView ? (
        <BookingsListView
          bookings={filteredBookings}
          onStatusUpdate={updateBookingStatus}
          onEdit={handleEditBooking}
          onView={handleViewBooking} // This was already correct, BookingsListViewProps expects onView
          searchTerm={searchTerm}
          statusFilter={statusFilter}
        />
      ) : (
        <BookingCalendarView 
          bookings={filteredBookings} 
          viewMode={calendarView}
          onStatusUpdate={updateBookingStatus}
          onCreateBooking={fetchBookings}
          onEdit={handleEditBooking}
        />
      )}

      {editingBooking && (
        <CompactEditBookingModal
          booking={editingBooking}
          onBookingUpdated={fetchBookings}
          onClose={handleCloseEdit}
          open={!!editingBooking}
        />
      )}

      {viewingBooking && (
        <BookingViewModal
          booking={viewingBooking}
          onClose={handleCloseView}
          onStatusUpdate={updateBookingStatus}
          onEdit={handleEditBooking}
          onPaymentReceived={confirmPaymentReceived}
          onBookingDeleted={fetchBookings}
          open={!!viewingBooking}
        />
      )}
    </div>
  );
};
