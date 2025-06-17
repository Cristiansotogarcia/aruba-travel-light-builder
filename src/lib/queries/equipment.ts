import { supabase } from '../supabaseClient';

import { Equipment } from './types';

export const getEquipment = async (userId: string) => {
  return supabase
    .from('equipment')
    .select('*')
    .eq('user_id', userId)
    .eq('available', true);
};

export const addEquipment = async (equipment: Omit<Equipment, 'id'>) => {
  return supabase
    .from('equipment')
    .insert([equipment])
    .select();
};

export const updateEquipment = async (userId: string, updates: Partial<Equipment>) => {
  return supabase
    .from('equipment')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', updates.id);
};

export const deleteEquipment = async (userId: string, equipmentId: string) => {
  return supabase
    .from('equipment')
    .delete()
    .eq('user_id', userId)
    .eq('id', equipmentId);
};