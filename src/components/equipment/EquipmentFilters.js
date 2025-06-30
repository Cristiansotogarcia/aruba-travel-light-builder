import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';
export const EquipmentFilters = ({ filters, activeFilters, onFiltersChange, onClearFilters }) => {
    const handleSearchChange = (value) => {
        onFiltersChange({ ...activeFilters, search: value });
    };
    const handleCategoryToggle = (category) => {
        const categories = activeFilters.categories.includes(category)
            ? activeFilters.categories.filter(c => c !== category)
            : [...activeFilters.categories, category];
        onFiltersChange({ ...activeFilters, categories });
    };
    const handleAvailabilityToggle = (availability) => {
        const availabilityList = activeFilters.availability.includes(availability)
            ? activeFilters.availability.filter(a => a !== availability)
            : [...activeFilters.availability, availability];
        onFiltersChange({ ...activeFilters, availability: availabilityList });
    };
    const hasActiveFilters = activeFilters.search ||
        activeFilters.categories.length > 0 ||
        activeFilters.availability.length > 0;
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [_jsx(CardTitle, { className: "text-lg", children: "Filters" }), hasActiveFilters && (_jsxs(Button, { variant: "ghost", size: "sm", onClick: onClearFilters, children: [_jsx(X, { className: "h-4 w-4 mr-1" }), "Clear All"] }))] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Search Equipment" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { placeholder: "Search by name or description...", value: activeFilters.search, onChange: (e) => handleSearchChange(e.target.value), className: "pl-10" })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Label, { children: "Categories" }), _jsx("div", { className: "flex flex-wrap gap-2", children: filters.categories.map((category) => (_jsx(Badge, { variant: activeFilters.categories.includes(category) ? "default" : "outline", className: "cursor-pointer", onClick: () => handleCategoryToggle(category), children: category }, category))) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Label, { children: "Availability" }), _jsx("div", { className: "flex flex-wrap gap-2", children: filters.availability.map((availability) => (_jsx(Badge, { variant: activeFilters.availability.includes(availability) ? "default" : "outline", className: "cursor-pointer capitalize", onClick: () => handleAvailabilityToggle(availability), children: availability === 'available' ? 'Available' :
                                        availability === 'limited' ? 'Limited Stock' : 'Out of Stock' }, availability))) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Label, { children: "Price Range (per day)" }), _jsxs("div", { className: "text-sm text-gray-600", children: ["$", filters.priceRange[0], " - $", filters.priceRange[1]] })] })] })] }));
};
