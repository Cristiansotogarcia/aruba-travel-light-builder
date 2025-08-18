import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ hasPermission: () => true })
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
    })),
  }
}));

vi.mock('./CloudflareImageUpload', () => ({
  CloudflareImageUpload: ({ isOpen, onImageSelect }: any) =>
    isOpen ? (
      <div>
        <button data-testid="upload1" onClick={() => onImageSelect('https://example.com/img1.jpg')}>Upload1</button>
        <button data-testid="upload2" onClick={() => onImageSelect('https://example.com/img2.jpg')}>Upload2</button>
      </div>
    ) : null,
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProductManagement } from './ProductManagement';

describe('ProductManagement image handling', () => {
  it('adds and removes multiple images', async () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>
    );

    await screen.findByText('Product Management');

    fireEvent.click(screen.getByText('Add Product'));
    fireEvent.click(screen.getByText('Add Image from Cloudflare'));
    fireEvent.click(screen.getByTestId('upload1'));
    await waitFor(() => expect(screen.getAllByAltText(/Selected/)).toHaveLength(1));

    fireEvent.click(screen.getByText('Add Image from Cloudflare'));
    fireEvent.click(screen.getByTestId('upload2'));
    await waitFor(() => expect(screen.getAllByAltText(/Selected/)).toHaveLength(2));

    fireEvent.click(screen.getAllByLabelText('Remove image')[0]);
    await waitFor(() => expect(screen.getAllByAltText(/Selected/)).toHaveLength(1));
  });
});
