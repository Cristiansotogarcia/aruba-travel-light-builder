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

vi.mock('@/lib/services/cloudflareUploadService', () => ({
  cloudflareUploadService: {
    validateFile: () => ({ valid: true }),
    uploadImage: vi.fn(),
    getImageUrl: vi.fn(),
  },
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductManagement } from './ProductManagement';

// The real CloudflareImageUpload is deliberately NOT mocked here. The other
// ProductManagement suite stubs it out, which is why no existing test could see a
// defect that only exists in how the two Radix dialogs nest.
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

const openImageDialog = async () => {
  renderAdmin();
  await screen.findByText('Product Management');
  fireEvent.click(screen.getByText('Add Product'));
  await screen.findByText('Create New Product');
  fireEvent.click(screen.getByText('Add Image from Cloudflare'));
  return screen.findByText('Upload Image to Cloudflare');
};

describe('Add Product dialog with the Cloudflare image dialog open', () => {
  it('stays open when the user presses inside the image dialog', async () => {
    const imageDialogTitle = await openImageDialog();

    // A real pointer press inside the image dialog. That dialog is portalled outside
    // the Add Product dialog's DOM node, so a non-modal child layer reads as an
    // outside press and dismisses the parent underneath it.
    fireEvent.pointerDown(imageDialogTitle);
    fireEvent.mouseDown(imageDialogTitle);
    fireEvent.click(imageDialogTitle);

    await waitFor(() => {
      expect(screen.queryByText('Upload Image to Cloudflare')).toBeTruthy();
    });
    expect(screen.queryByText('Create New Product')).toBeTruthy();
  });

  it('stays open when the image dialog is closed again', async () => {
    await openImageDialog();

    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText('Upload Image to Cloudflare')).toBeNull();
    });
    expect(screen.queryByText('Create New Product')).toBeTruthy();
  });
});
