
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';

interface FilterOptions {
  categories: string[];
  priceRange: [number, number];
  availability: string[];
}

interface ActiveFiltersState {
  search: string;
  categories: string[];
  priceRange: [number, number]; // Assuming priceRange can also be part of what's changed, though not directly modified in handlers here
  availability: string[];
}

interface EquipmentFiltersProps {
  filters: FilterOptions;
  activeFilters: ActiveFiltersState;
  onFiltersChange: (filters: ActiveFiltersState) => void;
  onClearFilters: () => void;
}

export const EquipmentFilters = ({ 
  filters, 
  activeFilters, 
  onFiltersChange,
  onClearFilters 
}: EquipmentFiltersProps) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...activeFilters, search: value });
  };

  const handleCategoryToggle = (category: string) => {
    const categories = activeFilters.categories.includes(category)
      ? activeFilters.categories.filter(c => c !== category)
      : [...activeFilters.categories, category];
    onFiltersChange({ ...activeFilters, categories });
  };

  const handleAvailabilityToggle = (availability: string) => {
    const availabilityList = activeFilters.availability.includes(availability)
      ? activeFilters.availability.filter(a => a !== availability)
      : [...activeFilters.availability, availability];
    onFiltersChange({ ...activeFilters, availability: availabilityList });
  };

  const hasActiveFilters = activeFilters.search || 
    activeFilters.categories.length > 0 || 
    activeFilters.availability.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Filters</CardTitle>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label>Search Equipment</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or description..."
              value={activeFilters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-2">
            {filters.categories.map((category) => (
              <Badge
                key={category}
                variant={activeFilters.categories.includes(category) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleCategoryToggle(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="space-y-3">
          <Label>Availability</Label>
          <div className="flex flex-wrap gap-2">
            {filters.availability.map((availability) => (
              <Badge
                key={availability}
                variant={activeFilters.availability.includes(availability) ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => handleAvailabilityToggle(availability)}
              >
                {availability === 'available' ? 'Available' : 
                 availability === 'limited' ? 'Limited Stock' : 'Out of Stock'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-3">
          <Label>Price Range (per day)</Label>
          <div className="text-sm text-gray-600">
            ${filters.priceRange[0]} - ${filters.priceRange[1]}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
