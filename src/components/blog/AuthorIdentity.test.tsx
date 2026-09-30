import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthorIdentity } from './AuthorIdentity';

describe('blog author identity', () => {
  it('shows the public byline, avatar, and at most 140 bio characters', () => {
    const { container } = render(<AuthorIdentity author={{ display_name: 'Roxanne', avatar_url: 'https://example.com/roxanne.jpg', bio: 'A'.repeat(160) }} />);
    expect(screen.getByText('Roxanne')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/roxanne.jpg');
    expect(screen.getByText('A'.repeat(140))).toBeInTheDocument();
    expect(screen.queryByText('A'.repeat(160))).not.toBeInTheDocument();
  });

  it('keeps an author identity visible when optional profile fields are empty', () => {
    render(<AuthorIdentity author={{ display_name: 'Roxanne', avatar_url: null, bio: null }} />);
    expect(screen.getByText('Roxanne')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('Stories from the Travel Light Aruba team.')).toBeInTheDocument();
  });

  it('shows initials when an avatar URL fails to load and retries a changed URL', () => {
    const { container, rerender } = render(<AuthorIdentity author={{ display_name: 'Roxanne', avatar_url: '/broken-photo.jpg', bio: null }} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('R')).toBeInTheDocument();

    rerender(<AuthorIdentity author={{ display_name: 'Roxanne', avatar_url: '/new-photo.jpg', bio: null }} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/new-photo.jpg');
  });
});
