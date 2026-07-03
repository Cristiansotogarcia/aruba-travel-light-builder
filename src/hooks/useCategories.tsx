import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubCategory {
  id: string;
  name: string;
  sort_order: number | null;
  category_id: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  sub_categories: SubCategory[];
}

const fetchCategories = async (): Promise<Category[]> => {
  const [{ data: cats, error: catError }, { data: subCats, error: subCatError }] = await Promise.all([
    supabase
      .from('equipment_category')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('equipment_sub_category')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false }),
  ]);

  if (catError) throw catError;
  if (subCatError) throw subCatError;

  // Build hierarchical structure
  const categoryMap = new Map(
    (cats ?? []).map(c => [c.id, { ...c, sub_categories: [] as SubCategory[] }])
  );

  (subCats ?? []).forEach(sc => {
    if (sc.category_id) {
      const cat = categoryMap.get(sc.category_id);
      if (cat) {
        cat.sub_categories.push(sc);
      }
    }
  });

  return Array.from(categoryMap.values());
};

// Shared react-query cache: Header, MobileNav and the filters all mount this hook,
// but only one fetch goes out per staleTime window instead of one per component.
export const useCategories = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['equipment-categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    categories: data ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch categories') : null,
    refetch,
  };
};
