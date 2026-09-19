import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CloudflareImageUpload } from './CloudflareImageUpload';

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/services/cloudflareUploadService', () => ({
  cloudflareUploadService: {
    validateFile: () => ({ valid: true }),
    uploadImage: vi.fn(),
    getImageUrl: vi.fn(),
  },
}));

describe('CloudflareImageUpload scroll lock', () => {
  // This dialog is opened from inside the Add Product dialog. It must stay a modal
  // layer: a non-modal child of a modal parent makes every press inside it read as an
  // outside press, which dismissed the product form underneath it.
  it('leaves the body unlocked once it has closed', async () => {
    const { rerender } = render(
      <CloudflareImageUpload isOpen onClose={() => {}} onImageSelect={() => {}} />
    );

    await screen.findByText('Upload Image to Cloudflare');

    rerender(
      <CloudflareImageUpload isOpen={false} onClose={() => {}} onImageSelect={() => {}} />
    );

    await waitFor(() => {
      expect(document.body.style.overflow).not.toBe('hidden');
      expect(document.body.style.pointerEvents).not.toBe('none');
    });
  });

  it('closes itself without swallowing the close callback', async () => {
    const onClose = vi.fn();
    render(<CloudflareImageUpload isOpen onClose={onClose} onImageSelect={() => {}} />);

    await screen.findByText('Upload Image to Cloudflare');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
