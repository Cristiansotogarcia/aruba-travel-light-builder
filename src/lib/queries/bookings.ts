
import { supabase } from '@/integrations/supabase/client';

import { Booking, BookingStatus, BookingItem } from '@/components/admin/calendar/types';

export const getBookings = async (userId: string) => {
  return supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId);
};

export const insertBooking = async (booking: Omit<Booking, 'id'>) => {
  return supabase
    .from('bookings')
    .insert([booking])
    .select();
};

export const updateBookingStatus = async (bookingId: string, newStatus: BookingStatus, oldStatus?: BookingStatus) => {
  try {
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select('*, booking_items(*, equipment(*))') // Ensure we get customer_email and other details
      .single();

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      throw updateError;
    }

    // Call the email notification function
    if (updatedBooking && updatedBooking.customer_email) {
      const equipmentDetails = updatedBooking.booking_items?.map((item: BookingItem) => `${item.equipment_name} (x${item.quantity})`).join(', ') || 'N/A';
      const { error: functionError } = await supabase.functions.invoke('booking-status-update-email', {
        body: {
          customer_email: updatedBooking.customer_email,
          customer_name: updatedBooking.customer_name,
          booking_id: updatedBooking.id,
          new_status: newStatus,
          old_status: oldStatus || updatedBooking.status, // Use provided oldStatus or the one from the updated booking before this change
          start_date: updatedBooking.start_date,
          equipment_details: equipmentDetails,
        },
      });

      if (functionError) {
        // Log the error but don't throw, as the primary operation (status update) succeeded.
        console.error('Error invoking email function from updateBookingStatus query:', functionError);
        // Optionally, you could add a non-blocking notification to the UI if this function is used directly by a UI component
      }
    }

    return updatedBooking;
  } catch (error) {
    console.error('Error in updateBookingStatus utility:', error);
    throw error;
  }
};
