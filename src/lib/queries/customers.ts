import { supabase } from '../supabaseClient';

import { Customer } from './types';

export const getCustomer = async (userId: string, customerId: string) => {
  return supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .eq('id', customerId)
    .single();
};

export const searchCustomers = async (userId: string, searchTerm: string) => {
  return supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
};

export const updateCustomer = async (userId: string, updates: Partial<Customer>) => {
  return supabase
    .from('customers')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', updates.id);
};