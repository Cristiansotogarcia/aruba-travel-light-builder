import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TagInput } from './TagInput';

describe('TagInput', () => {
  it('commits a trimmed, lowercased tag on Enter and clears the draft', () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Add a tag and press Enter');
    fireEvent.change(input, { target: { value: '  Aruba Trip  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['aruba trip']);
    expect(input).toHaveValue('');
  });

  it('commits on comma as well as Enter', () => {
    const onChange = vi.fn();
    render(<TagInput value={['beach']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'snorkel' } });
    fireEvent.keyDown(input, { key: ',' });

    expect(onChange).toHaveBeenCalledWith(['beach', 'snorkel']);
  });

  it('does not add a duplicate of an existing tag', () => {
    const onChange = vi.fn();
    render(<TagInput value={['beach']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Beach' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not add an empty/whitespace-only tag', () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes the last tag on Backspace when the draft is empty', () => {
    const onChange = vi.fn();
    render(<TagInput value={['beach', 'sun']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['beach']);
  });

  it('removes a tag via its remove button', () => {
    const onChange = vi.fn();
    render(<TagInput value={['beach', 'sun']} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Remove tag beach'));

    expect(onChange).toHaveBeenCalledWith(['sun']);
  });
});
