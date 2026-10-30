// src/lib/specialRequests/api.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const { insert, invoke } = vi.hoisted(() => ({
  insert: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock('./client', () => ({
  specialRequestsDb: {
    from: vi.fn(() => ({ insert })),
    functions: { invoke },
  },
}));

import { submitSpecialRequest } from './api';

const values = {
  name: ' Jane Doe ',
  email: 'jane@example.com',
  phone: '',
  request_type: 'last_minute' as const,
  message: 'Can we pick up equipment tonight?',
  preferred_dates: '',
};

describe('submitSpecialRequest', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('notifies staff with the stored row id only, never the row contents', async () => {
    insert.mockResolvedValue({ error: null });
    invoke.mockResolvedValue({ error: null });

    const record = await submitSpecialRequest(values);

    const inserted = insert.mock.calls[0][0];
    expect(inserted.id).toBe(record.id);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('special-request-email', { body: { id: record.id } });
  });

  it('does not notify when the insert fails, and rethrows the insert error', async () => {
    const failure = new Error('insert refused');
    insert.mockResolvedValue({ error: failure });

    await expect(submitSpecialRequest(values)).rejects.toBe(failure);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('still resolves when the notification fails, because the row is already stored', async () => {
    insert.mockResolvedValue({ error: null });
    invoke.mockRejectedValue(new Error('function down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(submitSpecialRequest(values)).resolves.toMatchObject({ name: 'Jane Doe', status: 'new' });
    warn.mockRestore();
  });
});
