import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BlogBioField } from './BlogBioField';
import { BLOG_BIO_MAX } from '@/lib/blog/types';

describe('BlogBioField', () => {
  it('caps the value at BLOG_BIO_MAX characters', () => {
    const onChange = vi.fn();
    render(<BlogBioField value="" onChange={onChange} />);

    const textarea = screen.getByLabelText('Bio');
    const tooLong = 'a'.repeat(BLOG_BIO_MAX + 60);

    fireEvent.change(textarea, { target: { value: tooLong } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(BLOG_BIO_MAX);
  });

  it('shows a live counter and the maxLength attribute', () => {
    render(<BlogBioField value="hello" onChange={() => {}} />);

    expect(screen.getByLabelText('Bio')).toHaveAttribute('maxLength', String(BLOG_BIO_MAX));
    expect(screen.getByText(`5/${BLOG_BIO_MAX} characters`)).toBeInTheDocument();
  });

  it('accepts a value already at the limit without truncating further', () => {
    const onChange = vi.fn();
    const atLimit = 'b'.repeat(BLOG_BIO_MAX - 1);
    render(<BlogBioField value={atLimit} onChange={onChange} />);

    const textarea = screen.getByLabelText('Bio');
    fireEvent.change(textarea, { target: { value: atLimit + 'x' } });

    expect(onChange.mock.calls[0][0]).toHaveLength(BLOG_BIO_MAX);
  });
});
