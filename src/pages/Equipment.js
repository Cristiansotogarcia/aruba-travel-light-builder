import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import { EquipmentFilters } from '@/components/equipment/EquipmentFilters';
import { getProducts } from '@/lib/queries/products';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
const Equipment = () => {
    const [filters, setFilters] = useState({
        search: '',
        categories: [],
        priceRange: [0, 0],
        availability: []
    });
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['equipment-products'],
        queryFn: getProducts,
        staleTime: 5 * 60 * 1000,
    });
    const equipmentData = useMemo(() => {
        return products.map((p) => {
            const stock = p.stock_quantity ?? 0;
            let availability;
            if (stock <= 0)
                availability = 'unavailable';
            else if (stock <= 5)
                availability = 'limited';
            else
                availability = 'available';
            return {
                id: p.id,
                name: p.name,
                category: p.equipment_category ? p.equipment_category.name : 'Uncategorized',
                sub_category: p.equipment_sub_category ? p.equipment_sub_category.name : 'General',
                price: p.price_per_day,
                image: p.image_url || (p.images && p.images[0]) || '',
                description: p.description || '',
                availability,
                features: [],
                category_sort_order: p.equipment_category?.sort_order ?? 0,
                sub_category_sort_order: p.equipment_sub_category?.sort_order ?? 0,
            };
        });
    }, [products]);
    const filterOptions = useMemo(() => {
        const categories = Array.from(new Set(equipmentData.map(e => e.category)));
        const prices = equipmentData.map(e => e.price);
        const priceRange = prices.length
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
        const map = {};
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
        const result = {};
        sortedCategories.forEach(([catName, catData]) => {
            const sortedSubs = Object.entries(catData.subs).sort((a, b) => a[1].order - b[1].order);
            result[catName] = {};
            sortedSubs.forEach(([subName, subData]) => {
                result[catName][subName] = subData.items;
            });
        });
        return result;
    }, [filteredEquipment]);
    if (isLoading) {
        return (_jsx("div", { className: "py-8 text-center", children: "Loading equipment..." }));
    }
    return (_jsxs("div", { className: "flex flex-col min-h-screen", children: [_jsx(Header, {}), _jsxs("main", { className: "flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsx("h1", { className: "text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-8", children: "Our Equipment" }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-8", children: [_jsx("div", { className: "lg:col-span-1", children: _jsx(EquipmentFilters, { filters: filterOptions, activeFilters: filters, onFiltersChange: setFilters, onClearFilters: () => setFilters({ search: '', categories: [], priceRange: filterOptions.priceRange, availability: [] }) }) }), _jsx("div", { className: "lg:col-span-3 space-y-8", children: Object.entries(groupedEquipment).map(([category, subCategories]) => (_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl mb-4", children: category }), Object.entries(subCategories).map(([subCategory, items]) => (_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-semibold text-gray-800 mb-3", children: subCategory }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6", children: items.map(equipment => (_jsx(EquipmentCard, { equipment: equipment }, equipment.id))) })] }, subCategory)))] }, category))) })] })] }), _jsx(Footer, {})] }));
};
export default Equipment;
