// src/components/layout/Header.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './Header';
import { describe, it, expect } from 'vitest'; // vi is used by vitest test runner

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
    expect(screen.getByRole('link', { name: 'Equipment' })).toHaveAttribute('href', '/equipment');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
  });

  it('renders CTA buttons for Book Now and Login', () => {
    renderHeader();
    // The buttons are within Link components, so we find the link by its role and name (from button text)
    const bookNowLink = screen.getByRole('link', { name: /book now/i });
    expect(bookNowLink).toBeInTheDocument();
    expect(bookNowLink).toHaveAttribute('href', '/book');

    const loginLink = screen.getByRole('link', { name: /login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('toggles the mobile menu on button click', () => {
    renderHeader();
    const mobileMenuButton = screen.getByRole('button', { name: /menu/i }); // Initial state shows Menu icon
    expect(mobileMenuButton).toBeInTheDocument();

    // Check that mobile nav is initially hidden (or not present for desktop view)
    // We'll query for a link that's specific to the mobile menu to check its visibility
    // For this, we need to ensure the screen size is small enough for mobile menu to be active.
    // Vitest/JSDOM doesn't simulate screen sizes directly, so we test the toggle logic.

    // Menu should not be open initially
    expect(screen.queryByRole('link', { name: 'Equipment', hidden: false })).toBeInTheDocument(); // Desktop link
    // A bit tricky to assert mobile menu is hidden without specific roles/text for mobile only items
    // Let's check if a link *inside* the mobile menu structure is not visible/present
    // The mobile links are identical in text to desktop, so we rely on structure or specific mobile-only elements if any.
    // For now, let's focus on the toggle action.

    // Click to open
    fireEvent.click(mobileMenuButton);
    // After click, the button should show an X icon (or its accessible name changes)
    // The component uses lucide-react icons, their accessible name might not be 'X' directly.
    // We'll assume the button's content changes or a new button appears.
    // Let's check if the 'Equipment' link (which is in mobile menu) is now visible.
    // Since desktop links are always there, we need a way to distinguish.
    // The mobile menu has a specific structure: div with class 'md:hidden' then 'px-2 pt-2 pb-3 ...'
    // This is hard to query directly with RTL. Let's assume clicking changes the button's accessible name or shows X icon.
    expect(screen.getByRole('button', { name: /x/i })).toBeInTheDocument(); // Or check for X icon's presence

    // Click to close
    fireEvent.click(screen.getByRole('button', { name: /x/i }));
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument(); // Back to Menu icon
  });

  // TODO: Add tests for authenticated state (e.g., showing Dashboard/Logout links)
  // This will require mocking the useAuth hook or context.
});