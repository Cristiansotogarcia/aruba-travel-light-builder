import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { getFeaturedProducts } from '@/lib/queries/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
export const FeaturedProducts = () => {
    const { data: products = [] } = useQuery({
        queryKey: ['featured-products'],
        queryFn: getFeaturedProducts,
        staleTime: 5 * 60 * 1000,
    });
    if (products.length === 0)
        return null;
    return (_jsx("section", { className: "py-16 bg-gray-50", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "text-center mb-12", children: [_jsx("h2", { className: "text-3xl md:text-4xl font-bold text-gray-900 mb-4", children: "Popular Equipment" }), _jsx("p", { className: "text-xl text-gray-600 max-w-2xl mx-auto", children: "Discover our most popular rental items" })] }), _jsx("div", { className: "grid md:grid-cols-3 gap-8", children: products.slice(0, 3).map((product) => (_jsxs(Card, { className: "overflow-hidden hover:shadow-lg transition-shadow", children: [product.image_url && (_jsx("img", { src: product.image_url, alt: product.name, className: "w-full h-48 object-cover" })), _jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-xl", children: product.name }) }), _jsxs(CardContent, { children: [product.description && (_jsx("p", { className: "text-gray-600 mb-2 line-clamp-3", children: product.description })), _jsxs("div", { className: "text-lg font-bold mb-4", children: ["$", Number(product.price_per_day).toFixed(2), "/day"] }), _jsx(Link, { to: "/equipment", className: "block", children: _jsx(Button, { className: "w-full", children: "View All" }) })] })] }, product.id))) })] }) }));
};
export default FeaturedProducts;
