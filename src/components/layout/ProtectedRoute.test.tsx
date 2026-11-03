import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ProtectedRoute from './ProtectedRoute';

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    user: null as { email_confirmed_at?: string | null } | null,
    profile: null as { role: string } | null,
    loading: false,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/components/common/SkeletonLoader', () => ({
  PageSkeleton: () => <div data-testid="page-skeleton">Loading…</div>,
}));

function LocationProbe({ label }: { label: string }) {
  const location = useLocation();
  return <div data-testid={`${label}-probe`}>{`${location.pathname}${location.search}`}</div>;
}

interface RouteProps {
  allowedRoles?: string[];
  requireConfirmedEmail?: boolean;
}

const renderAt = (path: string, routeProps: RouteProps = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LocationProbe label="login" />} />
        <Route path="/" element={<LocationProbe label="home" />} />
        <Route element={<ProtectedRoute {...routeProps} />}>
          <Route path="/pos" element={<div data-testid="pos-page">Pos page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuth.user = null;
    mockAuth.profile = null;
    mockAuth.loading = false;
  });

  it('shows the loading skeleton and does not redirect while auth is resolving', () => {
    mockAuth.loading = true;
    renderAt('/pos');
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('login-probe')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-probe')).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to /login with the original path and query preserved', () => {
    renderAt('/pos?x=1');
    expect(screen.getByTestId('login-probe')).toHaveTextContent('/login?redirect=%2Fpos%3Fx%3D1');
  });

  it('sends an unconfirmed user to / instead of /login when the route requires a confirmed email', () => {
    mockAuth.user = { email_confirmed_at: null };
    mockAuth.profile = { role: 'StoreStaff' };
    renderAt('/pos', { requireConfirmedEmail: true, allowedRoles: ['StoreStaff'] });
    expect(screen.getByTestId('home-probe')).toBeInTheDocument();
    expect(screen.queryByTestId('login-probe')).not.toBeInTheDocument();
  });

  it('fails closed to / when the role is gated and the profile has not loaded yet', () => {
    mockAuth.user = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    mockAuth.profile = null;
    renderAt('/pos', { allowedRoles: ['StoreStaff', 'Admin'] });
    expect(screen.getByTestId('home-probe')).toBeInTheDocument();
  });

  it('sends a confirmed user with a disallowed role to /', () => {
    mockAuth.user = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    mockAuth.profile = { role: 'Customer' };
    renderAt('/pos', {
      allowedRoles: ['StoreStaff', 'Booker', 'Admin', 'SuperUser'],
      requireConfirmedEmail: true,
    });
    expect(screen.getByTestId('home-probe')).toBeInTheDocument();
  });

  it.each(['StoreStaff', 'Admin'])('renders the outlet for a confirmed %s user', (role) => {
    mockAuth.user = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    mockAuth.profile = { role };
    renderAt('/pos', {
      allowedRoles: ['StoreStaff', 'Booker', 'Admin', 'SuperUser'],
      requireConfirmedEmail: true,
    });
    expect(screen.getByTestId('pos-page')).toBeInTheDocument();
  });

  it('lets an unconfirmed staff user through when the route does not require a confirmed email', () => {
    mockAuth.user = { email_confirmed_at: null };
    mockAuth.profile = { role: 'StoreStaff' };
    renderAt('/pos', { allowedRoles: ['StoreStaff'] });
    expect(screen.getByTestId('pos-page')).toBeInTheDocument();
  });
});
