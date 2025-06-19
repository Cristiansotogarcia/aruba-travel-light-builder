// src/components/layout/Footer.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Footer } from './Footer';
import { describe, it, expect } from 'vitest';

describe('Footer Component', () => {
  // it('should be a basic passing test', () => {
  //   expect(true).toBe(true);
  // });

  it('renders the copyright notice', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    // screen.debug(); // Removed for now
    const copyrightMatcher = (content: string, element: Element | null): boolean => {
      if (!element || !content) return false;
      const currentYear = new Date().getFullYear();
      const expectedText = `© ${currentYear} Aruba Travel Light. All rights reserved.`;
      // Check if the element's text content matches the expected dynamic copyright text
      return element.textContent === expectedText && content === expectedText;
    };
    const copyrightElement = screen.getByText(copyrightMatcher);
    expect(copyrightElement).toBeInTheDocument();
  });

  it('renders the company name', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    const companyNameElement = screen.getByText(/Travel Light Aruba/i, { selector: 'div.text-2xl' });
    expect(companyNameElement).toBeInTheDocument();
  });

  it('renders quick links', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    // Use exact match for the main "Equipment" link to avoid multiple matches
    expect(screen.getByRole('link', { name: /^Equipment$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Book Now/i })).toBeInTheDocument();
  });
});