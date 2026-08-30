import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Admin from './Admin';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1' },
    profile: { name: 'Test Admin', role: 'Admin' },
    loading: false,
    hasPermission: () => true,
  }),
}));

vi.mock('@/hooks/useSiteAssets', () => ({
  useSiteAssets: () => ({ assets: { logo: '/placeholder.svg' } }),
}));

vi.mock('@/components/admin/AdminDashboard', () => ({ AdminDashboard: () => <div>Dashboard stub</div> }));
vi.mock('@/components/admin/BookingsList', () => ({ BookingsList: () => null }));
vi.mock('@/components/admin/CustomersList', () => ({ CustomersList: () => null }));
vi.mock('@/components/admin/UserManagement', () => ({ UserManagement: () => null }));
vi.mock('@/components/admin/VisibilitySettings', () => ({ VisibilitySettings: () => null }));
vi.mock('@/components/admin/ProductManagement', () => ({ ProductManagement: () => null }));
vi.mock('@/components/admin/UnifiedCategoryOrderManager', () => ({ UnifiedCategoryOrderManager: () => null }));
vi.mock('@/components/admin/BookingAssignment', () => ({ BookingAssignment: () => null }));
vi.mock('@/components/admin/DriverTasks', () => ({ DriverTasks: () => null }));
vi.mock('@/components/admin/EnhancedReportsDashboard', () => ({ EnhancedReportsDashboard: () => null }));
vi.mock('@/components/admin/SiteSettings', () => ({ SiteSettings: () => null }));
vi.mock('@/components/admin/SeoManager', () => ({ SeoManager: () => null }));
vi.mock('@/components/admin/AboutUsManagement', () => ({ default: () => null }));

describe('Admin layout scroll container', () => {
  it('makes the products pane its own scroller so a leftover body lock cannot freeze it', () => {
    const { container } = render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    expect(main?.className).toMatch(/h-screen/);
    expect(main?.className).toMatch(/overflow-y-auto/);
    expect(screen.getByText('Dashboard stub')).toBeInTheDocument();
  });
});
