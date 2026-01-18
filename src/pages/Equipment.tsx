// src/pages/Equipment.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import { EquipmentFilters } from '@/components/equipment/EquipmentFilters';
import { FaqAccordion } from '@/components/common/FaqAccordion';
import { getProducts } from '@/lib/queries/products';
import { slugify } from '@/utils/slugify';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import type { ActiveFiltersState } from '@/components/equipment/EquipmentFilters';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/common/SEO';
import type { AvailabilityStatus } from '@/types/types';
import type { Database } from '@/types/supabase';

type EquipmentRow = Database['public']['Tables']['equipment']['Row'] & {
  equipment_category?: { name: string | null; sort_order: number | null } | null;
  equipment_sub_category?: { name: string | null; sort_order: number | null } | null;
};

type EquipmentItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  sub_category: string;
  price: number;
  price_per_week?: number;
  image: string;
  images: string[];
  description: string;
  availability: 'available' | 'limited' | 'unavailable';
  availability_status: AvailabilityStatus;
  features: string[];
  stock_quantity: number;
  category_sort_order: number;
  sub_category_sort_order: number;
  sort_order: number;
};

const availabilityStatuses: AvailabilityStatus[] = [
  'Available',
  'Low Stock',
  'Out of Stock',
  'Temporarily Not Available',
];

const normalizeAvailabilityStatus = (
  status: string | null | undefined,
  stock: number
): AvailabilityStatus => {
  if (status && availabilityStatuses.includes(status as AvailabilityStatus)) {
    return status as AvailabilityStatus;
  }
  if (stock <= 0) return 'Out of Stock';
  if (stock <= 5) return 'Low Stock';
  return 'Available';
};

const Equipment = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const subcategoryParam = searchParams.get('subcategory');
  
  const [filters, setFilters] = useState<ActiveFiltersState>(() => ({
    search: '',
    categories: categoryParam ? [categoryParam] : [] as string[],
    subcategory: subcategoryParam || '',
    priceRange: [0, 0] as [number, number],
    availability: [] as string[],
  }));
  
  // When URL parameters change, update the filters
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      categories: categoryParam ? [categoryParam] : [],
      subcategory: subcategoryParam || ''
    }));
  }, [categoryParam, subcategoryParam]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['equipment-products'],
    queryFn: getProducts,
    staleTime: 5 * 60 * 1000,  // 5 minutes "fresh"
    gcTime: 30 * 60 * 1000, // 30 minutes in cache (renamed from cacheTime in v5)
  });

  const equipmentData = useMemo<EquipmentItem[]>(() => {
    return products.map((p) => {
      const typedProduct = p as EquipmentRow;
      const stock = p.stock_quantity ?? 0;
      let availability: 'available' | 'limited' | 'unavailable';
      if (stock <= 0) availability = 'unavailable';
      else if (stock <= 5) availability = 'limited';
      else availability = 'available';
      const availability_status = normalizeAvailabilityStatus(p.availability_status, stock);

      return {
        id: p.id,
        name: p.name,
        slug: slugify(p.name),
        category: typedProduct.equipment_category?.name || 'Uncategorized',
        sub_category: typedProduct.equipment_sub_category?.name || 'General',
        price: p.price_per_day,
        price_per_week: p.price_per_week ?? undefined,

        image: (p.images && p.images[0]) || '',
        images: p.images || [],

        description: p.description || '',
        availability,
        availability_status,
        features: [],
        stock_quantity: stock,
        category_sort_order: typedProduct.equipment_category?.sort_order ?? 0,
        sub_category_sort_order: typedProduct.equipment_sub_category?.sort_order ?? 0,
          sort_order: p.sort_order ?? 0,
        };
    });
  }, [products]);

  const filterOptions = useMemo(() => {
    const categories = Array.from(new Set(equipmentData.map(e => e.category)));
    const prices = equipmentData.map(e => e.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    return {
      categories,
      priceRange: [minPrice, maxPrice] as [number, number],
      availability: ['available', 'limited', 'unavailable'],
    };
  }, [equipmentData]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      setFilters(f => ({ ...f, priceRange: filterOptions.priceRange as [number, number] }));
      isInitialMount.current = false;
    }
  }, [filterOptions.priceRange]);

  const filteredEquipment = useMemo(() => {
    return equipmentData.filter(item => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !item.name.toLowerCase().includes(searchLower) &&
          !item.description.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (filters.categories.length > 0 && !filters.categories.includes(item.category)) {
        return false;
      }
      if (filters.subcategory && item.sub_category !== filters.subcategory) {
        return false;
      }
      if (item.price < filters.priceRange[0] || item.price > filters.priceRange[1]) {
        return false;
      }
      if (filters.availability.length > 0 && !filters.availability.includes(item.availability)) {
        return false;
      }
      return true;
    });
  }, [filters, equipmentData]);

  const groupedEquipment = useMemo(() => {
    const map: Record<string, { order: number; subs: Record<string, { order: number; items: EquipmentItem[] }> }> = {};
    filteredEquipment.forEach(item => {
      const category = item.category || 'Uncategorized';
      const subCategory = item.sub_category || 'General';
      if (!map[category]) {
        map[category] = { order: item.category_sort_order, subs: {} };
      }
      if (!map[category].subs[subCategory]) {
        map[category].subs[subCategory] = { order: item.sub_category_sort_order, items: [] };
      }
      map[category].subs[subCategory].items.push(item);
    });

    const sortedCategories = Object.entries(map).sort((a, b) => a[1].order - b[1].order);
    const result: Record<string, Record<string, EquipmentItem[]>> = {};
    sortedCategories.forEach(([catName, catData]) => {
      const sortedSubs = Object.entries(catData.subs).sort((a, b) => a[1].order - b[1].order);
      result[catName] = {};
      sortedSubs.forEach(([subName, subData]) => {
        // Sort items within each subcategory by their sort_order
        result[catName][subName] = subData.items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      });
    });

    return result;
  }, [filteredEquipment]);

  if (isLoading) {
    return <div className="py-8 text-center">Loading equipment...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SEO
        title="Beach & Baby Equipment Rentals - TLA Aruba"
        description="Rent premium beach gear, baby equipment, and outdoor recreation items in Aruba. Beach chairs, umbrellas, strollers, car seats, and more with delivery service."
        pageSlug="equipment"
      />
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
            Our Equipment
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
            Browse curated beach and baby essentials with clear pricing and availability.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-6">
              <EquipmentFilters
                filters={filterOptions}
                activeFilters={filters}
                onFiltersChange={setFilters}
                onClearFilters={() =>
                  setFilters({
                    search: '',
                    categories: [],
                    subcategory: '',
                    priceRange: filterOptions.priceRange,
                    availability: [],
                  })
                }
              />
              <FaqAccordion />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-10">
            {Object.entries(groupedEquipment).map(([category, subCategories]) => (
              <div key={category}>
                <h2 className="text-2xl font-semibold text-foreground mb-4">{category}</h2>
                {Object.entries(subCategories).map(([subCategory, items]) => (
                  <div key={subCategory}>
                    <h3 className="text-lg font-semibold text-muted-foreground mb-3">{subCategory}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {items.map(equipment => (
                        <EquipmentCard key={equipment.id} equipment={equipment} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Equipment;
