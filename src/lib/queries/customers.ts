
import { supabase } from '@/integrations/supabase/client';

import { Booking } from './types';

export const getCustomer = async (userId: string, bookingId: string) => {
  return supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .eq('id', bookingId)
    .single();
};

export const searchCustomers = async (userId: string, searchTerm: string) => {
  return supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
};

export const updateCustomer = async (userId: string, updates: Partial<Booking> & { id: string }) => {
  return supabase
    .from('bookings')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', updates.id);
};
