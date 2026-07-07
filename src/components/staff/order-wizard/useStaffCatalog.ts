import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/lib/queries/products';
import type { CatalogGroup, CatalogItem } from './types';

// Raw shape returned by getProducts (equipment + joined category names).
interface EquipmentRow {
  id: string;
  name: string;
  description: string | null;
  price_per_day: number;
  price_per_week: number | null;
  images: string[] | null;
  stock_quantity: number | null;
  sort_order: number | null;
  equipment_category?: { name: string; sort_order: number | null } | null;
  equipment_sub_category?: { name: string; sort_order: number | null } | null;
}

/**
 * Live equipment catalog for the staff wizard, grouped by category and ordered
 * exactly like the public catalog (category sort, then sub-category, then item
 * sort — getProducts already applies those orderings). NO mock data.
 */
export function useStaffCatalog() {
  const query = useQuery({
    queryKey: ['equipment-products'],
    queryFn: getProducts,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const items = useMemo<CatalogItem[]>(() => {
    return ((query.data ?? []) as EquipmentRow[]).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      category: p.equipment_category?.name || 'Uncategorized',
      categorySortOrder: p.equipment_category?.sort_order ?? 9999,
      subCategory: p.equipment_sub_category?.name || 'General',
      price_per_day: Number(p.price_per_day),
      price_per_week: p.price_per_week != null ? Number(p.price_per_week) : null,
      image: (p.images && p.images[0]) || null,
      stock_quantity: p.stock_quantity ?? 0,
    }));
  }, [query.data]);

  const groups = useMemo<CatalogGroup[]>(() => {
    const byCategory = new Map<string, CatalogGroup>();
    for (const item of items) {
      let group = byCategory.get(item.category);
      if (!group) {
        group = { category: item.category, categorySortOrder: item.categorySortOrder, items: [] };
        byCategory.set(item.category, group);
      }
      group.items.push(item);
    }
    return Array.from(byCategory.values()).sort(
      (a, b) => a.categorySortOrder - b.categorySortOrder || a.category.localeCompare(b.category),
    );
  }, [items]);

  return { items, groups, isLoading: query.isLoading, error: query.error };
}
