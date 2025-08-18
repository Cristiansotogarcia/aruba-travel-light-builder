import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { EquipmentCard } from './EquipmentCard';

vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: any) => <div>{children}</div>,
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
  CarouselPrevious: () => null,
  CarouselNext: () => null,
}));

const equipment = {
  id: '1',
  name: 'Tent',
  slug: 'tent',
  category: 'Camping',
  price: 10,
  images: ['/tent.jpg'],
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
