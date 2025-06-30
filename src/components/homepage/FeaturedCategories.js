import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedProducts } from '@/lib/queries/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
export const FeaturedCategories = () => {
    const { data: products = [] } = useQuery({
        queryKey: ['featured-products'],
        queryFn: getFeaturedProducts,
        staleTime: 5 * 60 * 1000,
    });
    const categories = useMemo(() => {
        const groups = {};
        for (const product of products) {
            if (product.category === 'Water Sports')
                continue; // remove Water Sports
            if (!groups[product.category])
                groups[product.category] = [];
            groups[product.category].push(product);
        }
        return Object.entries(groups).map(([title, items]) => ({
            title,
            description: '',
            image: items[0]?.image_url || '',
            items: items.slice(0, 4).map(i => i.name),
        }));
    }, [products]);
    if (categories.length === 0) {
        return null;
    }
    return (_jsx("section", { className: "py-16 bg-gray-50", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "text-center mb-12", children: [_jsx("h2", { className: "text-3xl md:text-4xl font-bold text-gray-900 mb-4", children: "Popular Equipment" }), _jsx("p", { className: "text-xl text-gray-600 max-w-2xl mx-auto", children: "Discover our wide range of high-quality rental equipment perfect for your Aruba vacation" })] }), _jsx("div", { className: "grid md:grid-cols-3 gap-8", children: categories.map((category, index) => (_jsxs(Card, { className: "overflow-hidden hover:shadow-lg transition-shadow", children: [_jsx("div", { className: "aspect-video relative overflow-hidden", children: category.image && (_jsx("img", { src: category.image, alt: category.title, className: "w-full h-full object-cover hover:scale-105 transition-transform duration-300" })) }), _jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-xl", children: category.title }), category.description && _jsx("p", { className: "text-gray-600", children: category.description })] }), _jsxs(CardContent, { children: [_jsx("ul", { className: "space-y-2 mb-4", children: category.items.map((item, itemIndex) => (_jsxs("li", { className: "text-sm text-gray-700", children: ["\u2022 ", item] }, itemIndex))) }), _jsx(Link, { to: "/equipment", className: "block", children: _jsx(Button, { className: "w-full", children: "View All" }) })] })] }, index))) })] }) }));
};
