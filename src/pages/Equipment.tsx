
import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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

      // Availability filter
      if (filters.availability.length > 0 && !filters.availability.includes(item.availability)) {
        return false;
      }

      // Price range filter
      if (item.price < filters.priceRange[0] || item.price > filters.priceRange[1]) {
        return false;
      }

      return true;
    });
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      categories: [],
      priceRange: getPriceRange(),
      availability: []
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Equipment Catalog</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Browse our complete selection of high-quality rental equipment perfect for your Aruba vacation
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <EquipmentFilters
                filters={filterOptions}
                activeFilters={filters}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
              />
            </div>

            {/* Equipment Grid */}
            <div className="lg:col-span-3">
              <div className="mb-6 flex justify-between items-center">
                <p className="text-gray-600">
                  Showing {filteredEquipment.length} of {mockEquipment.length} items
                </p>
              </div>

              {filteredEquipment.length > 0 ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredEquipment.map((equipment) => (
                    <EquipmentCard key={equipment.id} equipment={equipment} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No equipment found matching your filters.</p>
                  <p className="text-gray-400 mt-2">Try adjusting your search criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Equipment;
