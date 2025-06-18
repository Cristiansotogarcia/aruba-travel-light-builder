import { useState, useMemo } from 'react';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import { EquipmentFilters } from '@/components/equipment/EquipmentFilters';
import { mockEquipment, getAvailableCategories, getAvailabilityOptions, getPriceRange } from '@/data/mockEquipment';

const Equipment = () => {
  const [filters, setFilters] = useState({
    search: '',
    categories: [] as string[],
    priceRange: getPriceRange() as [number, number],
    availability: [] as string[]
  });

  const filterOptions = {
    categories: getAvailableCategories(),
    priceRange: getPriceRange(),
    availability: getAvailabilityOptions()
  };

  const filteredEquipment = useMemo(() => {
    return mockEquipment.filter(item => {
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
  }, [filters]);

  return (
    <div>
      <h1>Equipment</h1>
      <EquipmentFilters 
        filters={filterOptions} 
        activeFilters={filters} 
        onFiltersChange={setFilters} 
        onClearFilters={() => setFilters({ search: '', categories: [], priceRange: getPriceRange(), availability: [] })} 
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment.map(equipment => (
          <EquipmentCard key={equipment.id} equipment={equipment} />
        ))}
      </div>
    </div>
  );
};

export default Equipment;
