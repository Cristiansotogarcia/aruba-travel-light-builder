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
  useSiteAssets: () => ({ assets: { logo: '/placeholder.svg' }, refresh: vi.fn() }),
}));

vi.mock('@/components/admin/blog/useBlogAuthorAccess', () => ({
  useBlogAuthorAccess: () => ({ isBlogger: false }),
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
vi.mock('@/components/admin/PendingReservations', () => ({ PendingReservations: () => null }));
vi.mock('@/components/admin/InvoicesList', () => ({ InvoicesList: () => null }));
vi.mock('@/components/admin/NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('@/components/pos', () => ({ PosPanel: () => <div data-testid="pos-panel-stub">PosPanel stub</div> }));

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Admin from './Admin';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
};

const renderAdmin = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin']}>
        <LocationProbe />
        <Admin />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Admin Point of Sale section', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('opens PosPanel inside /admin from a sidebar click, without navigating away', () => {
    renderAdmin();

    expect(screen.queryByTestId('pos-panel-stub')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Operations'));
    fireEvent.click(screen.getByText('Point of Sale'));

    expect(screen.getByTestId('pos-panel-stub')).toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/admin');
    expect(sessionStorage.getItem('admin:activeSection')).toBe('pos');
  });

  it('opens PosPanel inside /admin from the admin:navigate window event, without navigating away', () => {
    renderAdmin();

    act(() => {
      window.dispatchEvent(new CustomEvent('admin:navigate', { detail: { section: 'pos' } }));
    });

    expect(screen.getByTestId('pos-panel-stub')).toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/admin');
    expect(sessionStorage.getItem('admin:activeSection')).toBe('pos');
  });

  it('renders PosPanel on mount when admin:activeSection was already stashed as pos', () => {
    sessionStorage.setItem('admin:activeSection', 'pos');
    renderAdmin();

    expect(screen.getByTestId('pos-panel-stub')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard stub')).not.toBeInTheDocument();
  });
});
