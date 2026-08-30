import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Calendar, LayoutDashboard, Package } from 'lucide-react';
import { describe, it, expect, vi } from 'vitest';

import { AppShell } from './AppShell';
import type { AppNavEntry } from './types';

const signOut = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1' },
    profile: { name: 'Jane Ops', role: 'Admin' },
    signOut,
  }),
}));

vi.mock('@/hooks/useSiteAssets', () => ({
  useSiteAssets: () => ({ assets: {}, refresh: vi.fn() }),
}));

const nav: AppNavEntry[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  {
    id: 'admin',
    label: 'Administration',
    icon: Calendar,
    items: [{ id: 'bookings', label: 'Bookings', icon: Calendar }],
  },
  { id: 'catalog', label: 'Catalog', icon: Package, items: [{ id: 'equipment', label: 'Equipment', icon: Package }] },
];

const renderShell = (activeSection = 'overview') =>
  render(
    <BrowserRouter>
      <AppShell
        panelName="Test Panel"
        nav={nav}
        activeSection={activeSection}
        onSectionChange={vi.fn()}
      >
        <div>Section body</div>
      </AppShell>
    </BrowserRouter>,
  );

describe('AppShell', () => {
  it('renders the panel name, role identity and sign out control', () => {
    renderShell();
    expect(screen.getAllByText('Test Panel').length).toBeGreaterThan(0);
    expect(screen.getByText('Jane Ops')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('renders role-appropriate nav destinations and content', () => {
    renderShell();
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Catalog')).toBeInTheDocument();
    expect(screen.getByText('Section body')).toBeInTheDocument();
  });

  it('exposes a mobile menu trigger but no marketing navigation', () => {
    renderShell();
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
    // The staff shell must never surface the public marketing chrome.
    expect(screen.queryByRole('link', { name: /book now/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/about/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contact/i)).not.toBeInTheDocument();
  });

  it('collapses the desktop sidebar to an icon rail', () => {
    renderShell();
    const collapse = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapse);
    // After collapsing, an expand affordance is shown.
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it('makes the content pane its own scroller so a leftover body lock cannot freeze it', () => {
    const { container } = renderShell();
    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    expect(main?.className).toMatch(/h-screen/);
    expect(main?.className).toMatch(/overflow-y-auto/);
    expect(screen.getByText('Section body')).toBeInTheDocument();
  });
});
