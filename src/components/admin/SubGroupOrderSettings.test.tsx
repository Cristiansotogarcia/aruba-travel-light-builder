import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubGroupOrderSettings } from './SubGroupOrderSettings.tsx';

// Mock supabase client
let db: any[] = [];
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
  },
}));

beforeEach(() => {
  db = [
    {
      id: '1',
      name: 'Coolers',
      sort_order: 0,
      equipment_category: { id: 'cat', name: 'Outdoor', sort_order: 0 },
    },
    {
      id: '2',
      name: 'Shades',
      sort_order: 0,
      equipment_category: { id: 'cat', name: 'Outdoor', sort_order: 0 },
    },
  ];

  fromMock.mockImplementation(() => ({
    select: () => ({
      order: () => Promise.resolve({ data: db, error: null }),
    }),
    update: ({ sort_order }: { sort_order: number }) => ({
      eq: (_: string, id: string) => {
        const item = db.find(d => d.id === id);
        if (item) item.sort_order = sort_order;
        return Promise.resolve({ error: null });
      },
    }),
  }));
});

const renderComp = () =>
  render(
    <BrowserRouter>
      <SubGroupOrderSettings />
    </BrowserRouter>
  );

describe('SubGroupOrderSettings', () => {
  it('persists entered sort orders on reload', async () => {
    const { unmount } = renderComp();
    await waitFor(() => screen.getByText('Coolers'));

    const coolersInput = within(screen.getByText('Coolers').parentElement as HTMLElement).getByRole('spinbutton') as HTMLInputElement;
    const shadesInput = within(screen.getByText('Shades').parentElement as HTMLElement).getByRole('spinbutton') as HTMLInputElement;

    fireEvent.change(coolersInput, { target: { value: '1' } });
    fireEvent.change(shadesInput, { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /save order/i }));

    await waitFor(() => expect(db[0].sort_order).toBe(1));

    unmount();

    renderComp();
    await waitFor(() => screen.getByText('Coolers'));

    const coolersReload = within(screen.getByText('Coolers').parentElement as HTMLElement).getByRole('spinbutton') as HTMLInputElement;
    const shadesReload = within(screen.getByText('Shades').parentElement as HTMLElement).getByRole('spinbutton') as HTMLInputElement;

    expect(coolersReload.value).toBe('1');
    expect(shadesReload.value).toBe('2');
  });

  it('disallows negative numbers', async () => {
    renderComp();
    await waitFor(() => screen.getByText('Coolers'));

    const coolersInput = within(screen.getByText('Coolers').parentElement as HTMLElement).getByRole('spinbutton') as HTMLInputElement;

    expect(coolersInput).toHaveAttribute('min', '0');
  });
});

