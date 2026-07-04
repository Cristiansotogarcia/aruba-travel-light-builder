import { supabase } from '@/integrations/supabase/client';

import { Equipment } from './types';

// Use any to avoid deep type instantiation with Supabase
/* eslint-disable @typescript-eslint/no-explicit-any */

export const getEquipment = async (userId: string): Promise<{ data: any; error: any }> => {
  // @ts-ignore - Supabase query type instantiation is excessively deep
  const result = await supabase
    .from('equipment')
    .select('*')
    .eq('user_id', userId)
    .eq('available', true);
  
  return {
    data: result.data,
    error: result.error,
  };
};

export const addEquipment = async (equipment: Omit<Equipment, 'id'>): Promise<{ data: any; error: any }> => {
  const result = await supabase
    .from('equipment')
    .insert([equipment])
    .select();
  
  return {
    data: result.data,
    error: result.error,
  };
};

export const updateEquipment = async (userId: string, updates: Partial<Equipment> & { id: string }): Promise<{ data: any; error: any }> => {
  // @ts-ignore - Supabase query type instantiation is excessively deep
  const result = await supabase
    .from('equipment')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', updates.id);
  
  return {
    data: result.data,
    error: result.error,
  };
};

export const deleteEquipment = async (userId: string, equipmentId: string): Promise<{ data: any; error: any }> => {
  // @ts-ignore - Supabase query type instantiation is excessively deep
  const result = await supabase
    .from('equipment')
    .delete()
    .eq('user_id', userId)
    .eq('id', equipmentId);
  
  return {
    data: result.data,
    error: result.error,
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */