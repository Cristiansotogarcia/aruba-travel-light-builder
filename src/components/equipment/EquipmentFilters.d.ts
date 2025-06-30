interface FilterOptions {
    categories: string[];
    priceRange: [number, number];
    availability: string[];
}
interface ActiveFiltersState {
    search: string;
    categories: string[];
    priceRange: [number, number];
    availability: string[];
}
interface EquipmentFiltersProps {
    filters: FilterOptions;
    activeFilters: ActiveFiltersState;
    onFiltersChange: (filters: ActiveFiltersState) => void;
    onClearFilters: () => void;
}
export declare const EquipmentFilters: ({ filters, activeFilters, onFiltersChange, onClearFilters }: EquipmentFiltersProps) => import("react/jsx-runtime").JSX.Element;
export {};
