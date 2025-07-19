import { useState, useEffect } from 'react';
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

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories
      const { data: cats, error: catError } = await supabase
        .from('equipment_category')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (catError) throw catError;

      // Fetch subcategories
      const { data: subCats, error: subCatError } = await supabase
        .from('equipment_sub_category')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (subCatError) throw subCatError;

      // Build hierarchical structure
      const categoryMap = new Map(cats.map(c => [c.id, { ...c, sub_categories: [] as SubCategory[] }]));
      
      subCats.forEach(sc => {
        if (sc.category_id) {
          const cat = categoryMap.get(sc.category_id);
          if (cat) {
            cat.sub_categories.push(sc);
          }
        }
      });

      setCategories(Array.from(categoryMap.values()));
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  };
};