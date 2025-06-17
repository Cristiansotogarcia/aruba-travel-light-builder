import { supabase } from '../supabaseClient';

import { Booking } from './types';

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

export const updateBookingStatus = async (id: string, status: Booking['status']) => {
  return supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);
};