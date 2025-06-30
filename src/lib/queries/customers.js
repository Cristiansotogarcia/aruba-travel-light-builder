import { supabase } from '@/integrations/supabase/client';
export const getCustomer = async (userId, bookingId) => {
    return supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .eq('id', bookingId)
        .single();
};
export const searchCustomers = async (userId, searchTerm) => {
    return supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
};
export const updateCustomer = async (userId, updates) => {
    return supabase
        .from('bookings')
        .update(updates)
        .eq('user_id', userId)
        .eq('id', updates.id);
};
