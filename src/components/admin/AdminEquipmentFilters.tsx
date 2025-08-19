import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { X } from 'lucide-react';

export interface ActiveAdminFiltersState {
  category: string;
  subcategory: string;
}

interface AdminEquipmentFiltersProps {
  activeFilters: ActiveAdminFiltersState;
  onFiltersChange: (filters: ActiveAdminFiltersState) => void;
  onClearFilters: () => void;
}

export const AdminEquipmentFilters = ({
  activeFilters,
  onFiltersChange,
  onClearFilters
}: AdminEquipmentFiltersProps) => {
  const { categories, loading: categoriesLoading } = useCategories();

  const availableSubcategories = useMemo(() => {
    if (!activeFilters.category) return [];
    const selectedCategory = categories.find(cat => cat.name === activeFilters.category);
    return selectedCategory?.sub_categories || [];
  }, [categories, activeFilters.category]);

  const handleCategoryChange = (category: string) => {
    onFiltersChange({
      category: category === 'all' ? '' : category,
      subcategory: '', // Reset subcategory when category changes
    });
  };

  const handleSubcategoryChange = (subcategory: string) => {
    onFiltersChange({
      ...activeFilters,
      subcategory: subcategory === 'all' ? '' : subcategory,
    });
  };

  const hasActiveFilters = activeFilters.category || activeFilters.subcategory;

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
        {/* Categories */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Category</Label>
          <Select
            value={activeFilters.category || 'all'}
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
