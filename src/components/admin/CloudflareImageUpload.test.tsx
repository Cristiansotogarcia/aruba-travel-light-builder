import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
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
  it('does not lock body scroll when open so a parent product Dialog can keep its lock', () => {
    render(
      <CloudflareImageUpload
        isOpen
        onClose={() => {}}
        onImageSelect={() => {}}
      />
    );

    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
