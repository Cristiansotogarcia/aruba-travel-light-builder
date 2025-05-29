
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateBookingModal } from './CreateBookingModal';
import { EditBookingModal } from './EditBookingModal';
import { BookingCalendarView } from './BookingCalendarView';
import { BookingFilters } from './BookingFilters';
import { BookingsListView } from './BookingsListView';

interface BookingItem {
  equipment_name: string;
  quantity: number;
  equipment_price: number;
  subtotal: number;
  equipment_id: string;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  booking_items?: BookingItem[];
}

export const BookingsList = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showListView, setShowListView] = useState(false);
  const [calendarView, setCalendarView] = useState<'day' | 'week'>('day');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter]);

  const fetchBookings = async () => {
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
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
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
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(bookings.map(booking =>
        booking.id === bookingId
          ? { ...booking, status: newStatus }
          : booking
      ));

      toast({
        title: "Success",
        description: `Booking status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive"
      });
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
  };

  const handleCloseEdit = () => {
    setEditingBooking(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
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
          searchTerm={searchTerm}
          statusFilter={statusFilter}
        />
      ) : (
        <BookingCalendarView 
          bookings={filteredBookings} 
          viewMode={calendarView}
          onStatusUpdate={updateBookingStatus}
          onCreateBooking={fetchBookings}
        />
      )}

      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onBookingUpdated={fetchBookings}
          onClose={handleCloseEdit}
          open={!!editingBooking}
        />
      )}
    </div>
  );
};
