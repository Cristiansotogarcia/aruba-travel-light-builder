import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import DOMPurify from 'dompurify';
export const EquipmentCard = ({ equipment }) => {
    const sanitizedDescription = useMemo(() => DOMPurify.sanitize(equipment.description), [equipment.description]);
    const getAvailabilityColor = (availability) => {
        switch (availability) {
            case 'available':
                return 'bg-green-100 text-green-800';
            case 'limited':
                return 'bg-yellow-100 text-yellow-800';
            case 'unavailable':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    const getAvailabilityText = (availability) => {
        switch (availability) {
            case 'available':
                return 'Available';
            case 'limited':
                return 'Limited Stock';
            case 'unavailable':
                return 'Out of Stock';
            default:
                return 'Unknown';
        }
    };
    return (_jsxs(Card, { className: "overflow-hidden hover:shadow-lg transition-shadow", children: [_jsxs("div", { className: "aspect-square relative overflow-hidden", children: [_jsx("img", { src: equipment.image, alt: equipment.name, className: "w-full h-full object-cover hover:scale-105 transition-transform duration-300" }), _jsx("div", { className: "absolute top-2 right-2", children: equipment.availability !== 'unavailable' && (_jsx(Badge, { className: getAvailabilityColor(equipment.availability), children: getAvailabilityText(equipment.availability) })) })] }), _jsxs(CardHeader, { children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsx(CardTitle, { className: "text-lg", children: equipment.name }), _jsx(Badge, { variant: "outline", className: "text-xs", children: equipment.category })] }), _jsx("p", { className: "text-gray-600 text-sm", dangerouslySetInnerHTML: { __html: sanitizedDescription } })] }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "flex justify-between items-center", children: _jsxs("span", { className: "text-2xl font-bold text-primary", children: ["$", equipment.price.toFixed(2), "/day"] }) }), equipment.features.length > 0 && (_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "Features:" }), _jsx("ul", { className: "text-xs text-gray-600 space-y-1", children: equipment.features.slice(0, 3).map((feature, index) => (_jsxs("li", { children: ["\u2022 ", feature] }, index))) })] }))] }) }), _jsx(CardFooter, { children: _jsx(Link, { to: "/book", className: "w-full hidden", hidden: true, children: _jsx(Button, { className: "w-full", disabled: equipment.availability === 'unavailable', children: 'Book Now' }) }) })] }));
};
