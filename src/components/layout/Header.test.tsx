// src/components/layout/Header.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './Header';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1' },
    profile: { role: 'Booker' },
    signOut: vi.fn(),
    loading: false,
  }),
}));

vi.mock('@/hooks/useSiteAssets', () => ({
  useSiteAssets: () => ({ assets: {}, refresh: vi.fn() }),
}));

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({ items: [] }),
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({ categories: [], loading: false }),
}));

describe('Header Component', () => {
  const renderHeader = () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
  };

  it('renders the logo and it links to the homepage', () => {
    renderHeader();
    const logo = screen.getByAltText('Travel Light Aruba');
    expect(logo).toBeInTheDocument();
    expect(logo.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders desktop navigation links correctly', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Equipment' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
  });

  it('renders booking and cart CTAs alongside auth controls', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /book now/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cart/i })).toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    expect(logoutBtn).toBeInTheDocument();
  });

  it('toggles the mobile menu on button click', () => {
    renderHeader();
    const mobileMenuButton = screen.getByRole('button', { name: /open menu/i });
    expect(mobileMenuButton).toBeInTheDocument();

    fireEvent.click(mobileMenuButton);
    const closeButton = screen.getByRole('button', { name: /close menu/i });
    expect(closeButton).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /book now/i }).length).toBeGreaterThan(0);

    fireEvent.click(closeButton);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  // TODO: Add tests for authenticated state (e.g., showing Dashboard/Logout links)
  // This will require mocking the useAuth hook or context.
});
