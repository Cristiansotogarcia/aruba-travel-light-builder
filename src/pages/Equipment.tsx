import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import { EquipmentFilters } from '@/components/equipment/EquipmentFilters';
import type { Equipment as EquipmentType } from '@/data/mockEquipment';
import { getProducts } from '@/lib/queries/products';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const Equipment = () => {
  const [filters, setFilters] = useState({
    search: '',
    categories: [] as string[],
    priceRange: [0, 0] as [number, number],
    availability: [] as string[]
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['equipment-products'],
    queryFn: getProducts,
    staleTime: 5 * 60 * 1000,
  });

  const equipmentData: EquipmentType[] = useMemo(() => {
    return products.map((p: any) => {
      const stock = p.stock_quantity ?? 0;
      let availability: 'available' | 'limited' | 'unavailable';
      if (stock <= 0) availability = 'unavailable';
      else if (stock <= 5) availability = 'limited';
      else availability = 'available';

      return {
        id: p.id,
        name: p.name,
        category: p.equipment_category.name,
        sub_category: p.sub_category,
        price: p.price_per_day,
        image: p.image_url || (p.images && p.images[0]) || '',
        description: p.description || '',
        availability,
        features: [],
      } as EquipmentType;
    });
  }, [products]);

  const filterOptions = useMemo(() => {
    const categories = Array.from(new Set(equipmentData.map(e => e.category)));
    const prices = equipmentData.map(e => e.price);
    const priceRange: [number, number] = prices.length
      ? [Math.min(...prices), Math.max(...prices)]
      : [0, 0];
    return {
      categories,
      priceRange,
      availability: ['available', 'limited', 'unavailable'],
    };
  }, [equipmentData]);

  useEffect(() => {
    setFilters(f => ({ ...f, priceRange: filterOptions.priceRange }));
  }, [filterOptions.priceRange]);

  const filteredEquipment = useMemo(() => {
    return equipmentData.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!item.name.toLowerCase().includes(searchLower) &&
            !item.description.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(item.category)) {
        return false;
      }
      // Price range filter
      if (item.price < filters.priceRange[0] || item.price > filters.priceRange[1]) {
        return false;
      }
      // Availability filter
      if (filters.availability.length > 0 && !filters.availability.includes(item.availability)) {
        return false;
      }
      return true;
    });
  }, [filters, equipmentData]);

  const groupedEquipment = useMemo(() => {
    return filteredEquipment.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      const subCategory = (item as any).sub_category || 'General';
      if (!acc[category]) {
        acc[category] = {};
      }
      if (!acc[category][subCategory]) {
        acc[category][subCategory] = [];
      }
      acc[category][subCategory].push(item);
      return acc;
    }, {} as Record<string, Record<string, EquipmentType[]>>);
  }, [filteredEquipment]);

  if (isLoading) {
    return (
      <div className="py-8 text-center">Loading equipment...</div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-8">
          Our Equipment
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <EquipmentFilters 
              filters={filterOptions} 
              activeFilters={filters} 
              onFiltersChange={setFilters} 
              onClearFilters={() => setFilters({ search: '', categories: [], priceRange: filterOptions.priceRange, availability: [] })}
            />
          </div>
          <div className="lg:col-span-3 space-y-8">
            {Object.entries(groupedEquipment).map(([category, subCategories]) => (
              <div key={category}>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl mb-4">
                  {category}
                </h2>
                {Object.entries(subCategories).map(([subCategory, items]) => (
                  <div key={subCategory}>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">{subCategory}</h3>
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
