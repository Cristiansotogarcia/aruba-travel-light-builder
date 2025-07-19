import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { Search, X } from 'lucide-react';

export interface FilterOptions {
  categories: string[];
  priceRange: [number, number];
  availability: string[];
}

export interface ActiveFiltersState {
  search: string;
  categories: string[];
  subcategory: string;
  priceRange: [number, number];
  availability: string[];
}

interface EquipmentFiltersProps {
  filters: FilterOptions;
  activeFilters: ActiveFiltersState;
  onFiltersChange: (filters: ActiveFiltersState) => void;
  onClearFilters: () => void;
}

export const EquipmentFilters = ({
  activeFilters,
  onFiltersChange,
  onClearFilters
}: EquipmentFiltersProps) => {
  const { categories, loading: categoriesLoading } = useCategories();
  
  // Get subcategories for the selected category
  const availableSubcategories = useMemo(() => {
    if (activeFilters.categories.length === 0) return [];
    const selectedCategory = categories.find(cat => cat.name === activeFilters.categories[0]);
    return selectedCategory?.sub_categories || [];
  }, [categories, activeFilters.categories]);
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...activeFilters, search: value });
  };

  const handleCategoryChange = (category: string) => {
    const newCategories = category === 'all' ? [] : [category];
    onFiltersChange({
      ...activeFilters,
      categories: newCategories,
      subcategory: '', // Reset subcategory when category changes
    });
  };
  
  const handleSubcategoryChange = (subcategory: string) => {
    onFiltersChange({
      ...activeFilters,
      subcategory: subcategory === 'all' ? '' : subcategory,
    });
  };

  const hasActiveFilters = activeFilters.search || activeFilters.categories.length > 0 || activeFilters.subcategory;

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
          <Label className="text-sm font-medium">Category</Label>
          <Select
            value={activeFilters.categories.length > 0 ? activeFilters.categories[0] : 'all'}
            onValueChange={handleCategoryChange}
            disabled={categoriesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Subcategories */}
        {availableSubcategories.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Subcategory</Label>
            <Select
              value={activeFilters.subcategory || 'all'}
              onValueChange={handleSubcategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {availableSubcategories.map(subcategory => (
                  <SelectItem key={subcategory.id} value={subcategory.name}>
                    {subcategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
