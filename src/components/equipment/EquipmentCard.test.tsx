import { render } from '@testing-library/react';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
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
  image: '/thumb.jpg',
  images: ['/tent1.jpg', '/tent2.jpg'],
  description: '<b>Single</b><br><script>alert("xss")</script>',
  availability: 'available' as const,
  features: [] as string[],
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
