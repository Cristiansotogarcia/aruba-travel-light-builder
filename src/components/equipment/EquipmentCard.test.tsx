import { render } from '@testing-library/react';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { EquipmentCard } from './EquipmentCard';
import type { PropsWithChildren } from 'react';

vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CarouselContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CarouselItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CarouselPrevious: () => null,
  CarouselNext: () => null,
}));

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

const equipment = {
  id: '1',
  name: 'Tent',
  slug: 'tent',
  category: 'Camping',
  price: 10,
  price_per_week: 50,
  image: '/thumb.jpg',
  images: ['/tent1.jpg', '/tent2.jpg'],
  description: '<b>Single</b><br><script>alert("xss")</script>',
  availability: 'available' as const,
  availability_status: 'Available',
  features: [] as string[],
  stock_quantity: 5,
};

describe('EquipmentCard', () => {
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

  it('renders images in modal carousel', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <EquipmentCard equipment={equipment} />
      </BrowserRouter>
    );
    await user.click(screen.getByText('Read more'));
    const dialog = await screen.findByRole('dialog');
    const imgs = within(dialog).getAllByRole('img');
    expect(imgs).toHaveLength(equipment.images.length);
    expect(imgs[0]).toHaveAttribute('src', equipment.images[0]);
  });
});
