import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { StepDates } from './StepDates';

// Day buttons are labelled like "Tuesday, November 3rd, 2026", with extra words
// for today and selected days. Outside days repeat the label, so skip those cells.
const dayButton = (date: Date) => {
  const label = format(date, 'EEEE, MMMM do, yyyy');
  const match = screen
    .getAllByRole('button', { name: (name) => name.includes(label) })
    .find((b) => !b.closest('td')?.hasAttribute('data-outside'));
  if (!match) throw new Error(`no in-month day button for ${label}`);
  return match;
};

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

// Start two days out so the range never touches past days. One month is
// shown, so page forward when a date falls in the next month.
const start = addDays(new Date(), 2);
const shown = { month: new Date().getMonth() };
const clickDay = async (user: ReturnType<typeof userEvent.setup>, date: Date) => {
  if (date.getMonth() !== shown.month) {
    await user.click(screen.getByRole('button', { name: /next month/i }));
    shown.month = date.getMonth();
  }
  await user.click(dayButton(date));
};

describe('StepDates', () => {
  it('accepts a one-night order', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepDates startDate="" endDate="" onChange={onChange} />);
    shown.month = new Date().getMonth();
    const end = addDays(start, 1);
    await clickDay(user, start);
    await clickDay(user, end);
    expect(onChange).toHaveBeenLastCalledWith(iso(start), iso(end));
  });

  it('does not commit a same-day range', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepDates startDate="" endDate="" onChange={onChange} />);
    shown.month = new Date().getMonth();
    await clickDay(user, start);
    await clickDay(user, start);
    for (const [, end] of onChange.mock.calls) expect(end).toBe('');
  });
});
