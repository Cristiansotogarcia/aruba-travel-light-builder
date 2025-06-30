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
  availability: 'available' as const,
  features: [] as string[],
};

describe('EquipmentCard sanitation', () => {
  it('renders sanitized HTML description', () => {
    render(
      <BrowserRouter>
        <EquipmentCard equipment={equipment} />
      </BrowserRouter>
    );
    const bold = screen.getByText('Single');
    expect(bold.tagName).toBe('B');
    expect(document.querySelector('script')).toBeNull();
  });
});
