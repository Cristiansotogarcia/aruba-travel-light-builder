import { supabase } from '@/integrations/supabase/client';

export const getProducts = async () => {
  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      equipment_category (
        name,
        sort_order
      ),
      equipment_sub_category (
        name,
        sort_order
      )
    `)
    .order('sort_order', { foreignTable: 'equipment_category', ascending: true })
    .order('sort_order', { foreignTable: 'equipment_sub_category', ascending: true })
    .order('sort_order', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
};

export const getFeaturedProducts = async () => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('featured', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};
