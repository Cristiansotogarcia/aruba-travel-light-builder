import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { EquipmentCard } from './EquipmentCard';
const equipment = {
    id: '1',
    name: 'Tent',
    category: 'Camping',
    price: 10,
    image: '/tent.jpg',
    description: '<b>Single</b><br><script>alert("xss")</script>',
    availability: 'available',
    features: [],
};
describe('EquipmentCard sanitation', () => {
    it('renders sanitized HTML description', () => {
        render(_jsx(BrowserRouter, { children: _jsx(EquipmentCard, { equipment: equipment }) }));
        const bold = screen.getByText('Single');
        expect(bold.tagName).toBe('B');
        expect(document.querySelector('script')).toBeNull();
    });
});
