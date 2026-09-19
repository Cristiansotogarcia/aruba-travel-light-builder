import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ hasPermission: () => true })
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

const equipment = [
  { id: '1', name: 'Beach Chair', description: 'Foldable chair', images: [], price_per_day: 10, availability_status: 'Available', equipment_category: { name: 'Beach' } },
  { id: '2', name: 'Baby Crib', description: 'Travel crib', images: [], price_per_day: 20, availability_status: 'Available', equipment_category: { name: 'Baby' } },
  { id: '3', name: 'Umbrella', description: 'Shade for the beach', images: [], price_per_day: 5, availability_status: 'Available', equipment_category: { name: 'Beach' } },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockResolvedValue({
        data: table === 'equipment' ? equipment : [],
        error: null,
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
    })),
  }
}));

vi.mock('./CloudflareImageUpload', () => ({
  CloudflareImageUpload: () => null,
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductManagement } from './ProductManagement';

const renderAdmin = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ProductManagement search', () => {
  it('narrows the list to products whose name matches, case-insensitively', async () => {
    renderAdmin();
    await screen.findByText('Beach Chair');
    expect(screen.getByText('Showing 3 of 3 products')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'baby' } });

    await waitFor(() => expect(screen.queryByText('Beach Chair')).toBeNull());
    expect(screen.getByText('Baby Crib')).toBeTruthy();
    expect(screen.getByText('Showing 1 of 3 products')).toBeTruthy();
  });

  it('matches on description too and clears back to the full list', async () => {
    renderAdmin();
    await screen.findByText('Umbrella');

    const input = screen.getByLabelText('Search');
    fireEvent.change(input, { target: { value: 'shade' } });
    await waitFor(() => expect(screen.queryByText('Baby Crib')).toBeNull());
    expect(screen.getByText('Umbrella')).toBeTruthy();

    fireEvent.click(screen.getByText('Clear All'));
    await waitFor(() => expect(screen.getByText('Baby Crib')).toBeTruthy());
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('keeps whitespace-only input from hiding anything', async () => {
    renderAdmin();
    await screen.findByText('Beach Chair');

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '   ' } });

    await waitFor(() => expect(screen.getByText('Showing 3 of 3 products')).toBeTruthy());
  });
});
