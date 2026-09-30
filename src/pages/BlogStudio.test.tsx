import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BlogStudio from './BlogStudio';

// BlogStudio is the single home for blog work (owner feedback item 3): an admin
// sees the full "all posts + bloggers" surface that used to live only under
// Admin > Contents > Blog, while a plain blogger keeps seeing just their own
// posts/profile. It also must always offer a way back out (item 2).
const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const { mockAuth, mockAccess } = vi.hoisted(() => ({
  mockAuth: {
    user: { id: 'user-1' } as { id: string } | null,
    profile: { role: 'Booker' } as { role: string } | null,
    loading: false,
  },
  mockAccess: {
    author: null as null | { user_id: string; display_name: string; bio: string | null; avatar_url: string | null },
    isBlogger: false,
    isLoading: false,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/components/admin/blog/useBlogAuthorAccess', () => ({
  useBlogAuthorAccess: () => mockAccess,
}));

vi.mock('@/hooks/useSiteAssets', () => ({
  useSiteAssets: () => ({ assets: {}, refresh: vi.fn() }),
}));

vi.mock('@/components/admin/blog/BlogPostsList', () => ({
  BlogPostsList: ({ scope }: { scope: string }) => <div>Posts list ({scope})</div>,
}));

vi.mock('@/components/admin/blog/BlogBloggersTab', () => ({
  BlogBloggersTab: () => <div>Bloggers tab</div>,
}));

vi.mock('@/components/admin/blog/blogAdminApi', () => ({
  updateOwnBlogAuthorProfile: vi.fn().mockResolvedValue({}),
}));

const renderStudio = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BlogStudio />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('BlogStudio', () => {
  afterEach(() => {
    navigateMock.mockClear();
    mockAuth.user = { id: 'user-1' };
    mockAuth.profile = { role: 'Booker' };
    mockAccess.author = null;
    mockAccess.isBlogger = false;
  });

  it('shows the no-access card with a way back for a signed-in non-blogger, non-admin', () => {
    renderStudio();
    expect(screen.getByText(/no blogging access yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith('/booker');
  });

  it('gives a plain blogger only their own posts and profile, never the bloggers list', () => {
    mockAccess.isBlogger = true;
    mockAccess.author = { user_id: 'user-1', display_name: 'Jamie', bio: null, avatar_url: null };
    renderStudio();

    expect(screen.getByRole('button', { name: 'My Posts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Blogger Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bloggers' })).not.toBeInTheDocument();
    expect(screen.getByText('Posts list (own)')).toBeInTheDocument();
  });

  it('gives an admin the full all-posts + bloggers surface that Contents > Blog used to duplicate', () => {
    mockAuth.profile = { role: 'Admin' };
    mockAccess.isBlogger = false;
    renderStudio();

    expect(screen.getByRole('button', { name: 'All Posts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bloggers' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'My Blogger Profile' })).not.toBeInTheDocument();
    expect(screen.getByText('Posts list (admin)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bloggers' }));
    expect(screen.getByText('Bloggers tab')).toBeInTheDocument();
  });

  it('also offers an admin their own blogger profile tab when they hold an active byline', () => {
    mockAuth.profile = { role: 'Admin' };
    mockAccess.isBlogger = true;
    mockAccess.author = { user_id: 'user-1', display_name: 'Admin Byline', bio: null, avatar_url: null };
    renderStudio();

    expect(screen.getByRole('button', { name: 'My Blogger Profile' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'My Blogger Profile' }));
    expect(screen.getByText('My blogger profile')).toBeInTheDocument();
  });

  it('lets an admin leave Blog Studio back to the admin dashboard', () => {
    mockAuth.profile = { role: 'Admin' };
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith('/admin');
  });
});
