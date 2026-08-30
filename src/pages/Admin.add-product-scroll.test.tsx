import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1' },
    profile: { name: 'Test Admin', role: 'Admin' },
    loading: false,
    hasPermission: () => true,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSiteAssets', () => ({
  useSiteAssets: () => ({ assets: { logo: '/placeholder.svg' } }),
}));

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

vi.mock('@/integrations/supabase/client', () => {
  const createQuery = (data: unknown[]) => {
    const resolved = { data, error: null };
    const query: Record<string, unknown> = {};
    const self = () => query;
    query.select = vi.fn(self);
    query.order = vi.fn(self);
    query.eq = vi.fn(self);
    query.insert = vi.fn(async () => ({ error: null }));
    query.update = vi.fn(self);
    query.delete = vi.fn(self);
    query.then = (
      onFulfilled: (value: typeof resolved) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolved).then(onFulfilled, onRejected);
    return query;
  };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'equipment_category') {
          return createQuery([{ id: 'cat-1', name: 'Coolers', description: null, sort_order: 1 }]);
        }
        if (table === 'equipment_sub_category') {
          return createQuery([{ id: 'sub-1', name: 'Small', category_id: 'cat-1', sort_order: 1 }]);
        }
        return createQuery([]);
      }),
    },
  };
});

vi.mock('@/components/admin/AdminDashboard', () => ({ AdminDashboard: () => <div>Dashboard stub</div> }));
vi.mock('@/components/admin/BookingsList', () => ({ BookingsList: () => null }));
vi.mock('@/components/admin/CustomersList', () => ({ CustomersList: () => null }));
vi.mock('@/components/admin/UserManagement', () => ({ UserManagement: () => null }));
vi.mock('@/components/admin/VisibilitySettings', () => ({ VisibilitySettings: () => null }));
vi.mock('@/components/admin/UnifiedCategoryOrderManager', () => ({ UnifiedCategoryOrderManager: () => null }));
vi.mock('@/components/admin/BookingAssignment', () => ({ BookingAssignment: () => null }));
vi.mock('@/components/admin/DriverTasks', () => ({ DriverTasks: () => null }));
vi.mock('@/components/admin/EnhancedReportsDashboard', () => ({ EnhancedReportsDashboard: () => null }));
vi.mock('@/components/admin/SiteSettings', () => ({ SiteSettings: () => null }));
vi.mock('@/components/admin/SeoManager', () => ({ SeoManager: () => null }));
vi.mock('@/components/admin/AboutUsManagement', () => ({ default: () => null }));

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Admin from './Admin';

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const renderAdminEquipment = () => {
  sessionStorage.setItem('admin:activeSection', 'equipment');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const dialogNamed = (title: string) => {
  const heading = screen.getByText(title);
  const dialog = heading.closest('[role="dialog"]');
  expect(dialog).toBeTruthy();
  return dialog as HTMLElement;
};

describe('Admin Add Product dialog close path', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('pointer-events');
    document.body.removeAttribute('data-scroll-locked');
  });

  afterEach(() => {
    sessionStorage.clear();
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('pointer-events');
    document.body.removeAttribute('data-scroll-locked');
  });

  it('clears leftover body lock after category Select and image dialog, and keeps the products pane as its own scroller', async () => {
    const user = userEvent.setup();
    const { container } = renderAdminEquipment();

    await screen.findByText('Product Management');

    fireEvent.click(screen.getByRole('button', { name: /add product/i }));
    await screen.findByText('Create New Product');

    const productDialog = dialogNamed('Create New Product');
    const categorySelect = within(productDialog).getAllByRole('combobox')[0];
    await user.click(categorySelect);
    await user.click(await screen.findByRole('option', { name: 'Coolers' }));

    fireEvent.click(screen.getByRole('button', { name: /add image from cloudflare/i }));
    await screen.findByText('Upload Image to Cloudflare');

    fireEvent.click(within(dialogNamed('Upload Image to Cloudflare')).getByRole('button', { name: /close/i }));
    await waitFor(() => {
      expect(screen.queryByText('Upload Image to Cloudflare')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Create New Product')).toBeInTheDocument();

    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'none';
    document.body.setAttribute('data-scroll-locked', '1');

    fireEvent.click(within(dialogNamed('Create New Product')).getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(document.body.style.overflow).not.toBe('hidden');
      expect(document.body.style.pointerEvents).not.toBe('none');
      expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
    });

    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    expect(main?.className).toMatch(/h-screen/);
    expect(main?.className).toMatch(/overflow-y-auto/);
  });
});
