import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    profile: null as { role: string } | null,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/hooks/useSiteAssets', () => ({
  useSiteAssets: () => ({ assets: { logo: '/placeholder.svg' }, refresh: vi.fn() }),
}));

vi.mock('@/components/admin/blog/useBlogAuthorAccess', () => ({
  useBlogAuthorAccess: () => ({ isBlogger: false }),
}));

vi.mock('@/components/pos', () => ({
  PosWizard: () => <div data-testid="pos-wizard-stub">PosWizard stub</div>,
  TodayBoard: () => <div data-testid="today-board-stub">TodayBoard stub</div>,
  DrawerTab: () => <div data-testid="drawer-tab-stub">DrawerTab stub</div>,
  ReportTab: () => <div data-testid="report-tab-stub">ReportTab stub</div>,
}));

import Pos from './Pos';

const renderPos = () =>
  render(
    <MemoryRouter initialEntries={['/pos']}>
      <Routes>
        <Route path="/pos" element={<Pos />} />
        <Route path="/admin" element={<div data-testid="admin-probe">Admin page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('Pos page admin/SuperUser redirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('sends an Admin profile back to /admin and stashes the pos section', () => {
    mockAuth.profile = { role: 'Admin' };
    renderPos();

    expect(screen.getByTestId('admin-probe')).toBeInTheDocument();
    expect(screen.queryByTestId('pos-wizard-stub')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('admin:activeSection')).toBe('pos');
  });

  it('sends a SuperUser profile back to /admin and stashes the pos section', () => {
    mockAuth.profile = { role: 'SuperUser' };
    renderPos();

    expect(screen.getByTestId('admin-probe')).toBeInTheDocument();
    expect(screen.queryByTestId('pos-wizard-stub')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('admin:activeSection')).toBe('pos');
  });

  it('renders the standalone POS shell for StoreStaff without touching sessionStorage', () => {
    mockAuth.profile = { role: 'StoreStaff' };
    renderPos();

    expect(screen.queryByTestId('admin-probe')).not.toBeInTheDocument();
    expect(screen.getByTestId('pos-wizard-stub')).toBeInTheDocument();
    expect(sessionStorage.getItem('admin:activeSection')).toBeNull();
  });

  it('renders the standalone POS shell for Booker without touching sessionStorage', () => {
    mockAuth.profile = { role: 'Booker' };
    renderPos();

    expect(screen.queryByTestId('admin-probe')).not.toBeInTheDocument();
    expect(screen.getByTestId('pos-wizard-stub')).toBeInTheDocument();
    expect(sessionStorage.getItem('admin:activeSection')).toBeNull();
  });

  it('renders the POS shell when the profile has not loaded yet, instead of redirecting', () => {
    mockAuth.profile = null;
    renderPos();

    expect(screen.queryByTestId('admin-probe')).not.toBeInTheDocument();
    expect(screen.getByTestId('pos-wizard-stub')).toBeInTheDocument();
    expect(sessionStorage.getItem('admin:activeSection')).toBeNull();
  });
});
