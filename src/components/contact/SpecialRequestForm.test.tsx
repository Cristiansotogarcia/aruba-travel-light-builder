// src/components/contact/SpecialRequestForm.test.tsx
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SpecialRequestForm } from './SpecialRequestForm';
import { submitSpecialRequest } from '@/lib/specialRequests/api';

const toast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('@/lib/specialRequests/api', () => ({
  submitSpecialRequest: vi.fn(),
}));

const mockedSubmit = submitSpecialRequest as unknown as ReturnType<typeof vi.fn>;

function renderForm(route = '/contact') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SpecialRequestForm />
    </MemoryRouter>
  );
}

async function fillRequiredFields() {
  await userEvent.type(screen.getByLabelText('Name'), 'Jane Doe');
  await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
  await userEvent.type(screen.getByLabelText('Tell us what you need'), 'Need a car seat delivered.');
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('SpecialRequestForm', () => {
  it('shows field errors and does not submit when required fields are empty', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: /send request/i }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Please tell us what you need')).toBeInTheDocument();
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it('submits the trimmed, validated payload with the default (general) request type', async () => {
    mockedSubmit.mockResolvedValueOnce({ id: '1' });
    renderForm();

    await userEvent.type(screen.getByLabelText('Name'), '  Jane Doe  ');
    await userEvent.type(screen.getByLabelText('Email'), '  jane@example.com  ');
    await userEvent.type(screen.getByLabelText('Tell us what you need'), '  Need a car seat delivered.  ');
    await userEvent.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1));
    expect(mockedSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'Need a car seat delivered.',
        request_type: 'general',
      })
    );
    expect(await screen.findByText(/thanks.*your request is in/i)).toBeInTheDocument();
  });

  it('preselects request_type from ?type=last_minute', async () => {
    mockedSubmit.mockResolvedValueOnce({ id: '1' });
    renderForm('/contact?type=last_minute');

    await fillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() =>
      expect(mockedSubmit).toHaveBeenCalledWith(expect.objectContaining({ request_type: 'last_minute' }))
    );
  });

  it('preselects request_type from ?type=special_arrangement', async () => {
    mockedSubmit.mockResolvedValueOnce({ id: '1' });
    renderForm('/contact?type=special_arrangement');

    await fillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() =>
      expect(mockedSubmit).toHaveBeenCalledWith(expect.objectContaining({ request_type: 'special_arrangement' }))
    );
  });

  it('falls back to general when ?type is not one of the known request types', async () => {
    mockedSubmit.mockResolvedValueOnce({ id: '1' });
    renderForm('/contact?type=urgent-not-a-real-type');

    await fillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() =>
      expect(mockedSubmit).toHaveBeenCalledWith(expect.objectContaining({ request_type: 'general' }))
    );
  });

  it('shows a destructive toast and keeps the form editable when the submission fails', async () => {
    mockedSubmit.mockRejectedValueOnce(new Error('network down'));
    renderForm();

    await fillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not send your request', variant: 'destructive' })
    );
    // Form stays on screen (not the success state) so the visitor can retry.
    expect(screen.getByRole('button', { name: /send request/i })).toBeInTheDocument();
    expect(screen.queryByText(/thanks.*your request is in/i)).not.toBeInTheDocument();
  });
});
