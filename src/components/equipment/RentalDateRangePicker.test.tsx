import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { beforeEach, describe, expect, it } from 'vitest';
import { RentalDateRangePicker } from './RentalDateRangePicker';
import { RentalDatesProvider } from '@/hooks/useRentalDates';
import { MIN_NIGHTS } from '@/lib/rentalDates';

const renderPicker = () =>
  render(
    <MemoryRouter>
      <RentalDatesProvider>
        <RentalDateRangePicker />
      </RentalDatesProvider>
    </MemoryRouter>,
  );

// Day buttons are labelled like "Tuesday, November 3rd, 2026". Outside days
// repeat the same label in the neighbouring month grid, so skip those cells.
const dayButton = (date: Date) => {
  const label = format(date, 'EEEE, MMMM do, yyyy');
  const match = screen
    .getAllByRole('button', { name: label })
    .find((b) => !b.closest('td')?.hasAttribute('data-outside'));
  if (!match) throw new Error(`no in-month day button for ${label}`);
  return match;
};

// The popover trigger is the one button that announces a dialog.
const trigger = () => {
  const button = screen.getAllByRole('button').find((b) => b.getAttribute('aria-haspopup') === 'dialog');
  if (!button) throw new Error('picker trigger not found');
  return button;
};

const start = addDays(new Date(), 3);

const pick = async (nights: number) => {
  const user = userEvent.setup();
  renderPicker();
  await user.click(trigger());
  await user.click(dayButton(start));
  await user.click(dayButton(addDays(start, nights)));
  return user;
};

describe('RentalDateRangePicker', () => {
  beforeEach(() => localStorage.clear());

  it('accepts a stay of exactly the minimum nights', async () => {
    await pick(MIN_NIGHTS);
    expect(trigger()).toHaveTextContent(
      `${format(start, 'MMM d')} - ${format(addDays(start, MIN_NIGHTS), 'MMM d, yyyy')}`,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('accepts a longer stay', async () => {
    await pick(7);
    expect(trigger()).toHaveTextContent(format(addDays(start, 7), 'MMM d, yyyy'));
  });

  it('refuses a stay shorter than the minimum and tells the customer why', async () => {
    await pick(MIN_NIGHTS - 1);
    expect(trigger()).toHaveTextContent('Select your rental dates');
    // The short end date becomes a new start date and the hint asks for a return date.
    expect(screen.getByText(/Now pick your return date, at least/)).toBeInTheDocument();
  });

  it('shows the start-date hint when the picker opens', async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(trigger());
    expect(screen.getByText(`Pick your start date. Minimum ${MIN_NIGHTS} nights.`)).toBeInTheDocument();
  });

  it('accepts the end date clicked before the start date', async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(trigger());
    await user.click(dayButton(addDays(start, 5)));
    await user.click(dayButton(start));
    expect(trigger()).toHaveTextContent(
      `${format(start, 'MMM d')} - ${format(addDays(start, 5), 'MMM d, yyyy')}`,
    );
  });

  it('does not offer past days', async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(trigger());
    const yesterday = format(addDays(new Date(), -1), 'EEEE, MMMM do, yyyy');
    const buttons = screen.queryAllByRole('button', { name: yesterday });
    for (const b of buttons) expect(b).toBeDisabled();
    expect(within(document.body).queryAllByRole('grid').length).toBeGreaterThan(0);
  });
});
