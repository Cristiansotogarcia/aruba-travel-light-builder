import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ProductCard } from './ProductCard';

const product = {
  id: '1',
  name: 'Tent',
  description: '<b>Test</b><script>alert("xss")</script>',
  price_per_day: 10,
  category: 'Camping',
  images: ['/img.jpg'],
  stock_quantity: 1,
  availability_status: 'Available' as const,
};

describe('ProductCard sanitation', () => {
  it('renders sanitized HTML description', () => {
    render(
      <BrowserRouter>
        <ProductCard
          product={product as any}
          onEdit={() => {}}
          onDelete={() => {}}
          onToggleAvailability={() => {}}
        />
      </BrowserRouter>
    );
    const bold = screen.getByText('Test');
    expect(bold.tagName).toBe('B');
    expect(document.querySelector('script')).toBeNull();
  });
});
