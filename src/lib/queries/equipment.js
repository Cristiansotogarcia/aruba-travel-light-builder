import { supabase } from '@/integrations/supabase/client';
export const getEquipment = async (userId) => {
    return supabase
        .from('equipment')
        .select('*')
        .eq('user_id', userId)
        .eq('available', true);
};
export const addEquipment = async (equipment) => {
    return supabase
        .from('equipment')
        .insert([equipment])
        .select();
};
export const updateEquipment = async (userId, updates) => {
    return supabase
        .from('equipment')
        .update(updates)
        .eq('user_id', userId)
        .eq('id', updates.id);
};
export const deleteEquipment = async (userId, equipmentId) => {
    return supabase
        .from('equipment')
        .delete()
        .eq('user_id', userId)
        .eq('id', equipmentId);
};
