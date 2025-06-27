import { supabase } from '@/integrations/supabase/client';

export const getProducts = async () => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('created_at', { ascending: false });

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
