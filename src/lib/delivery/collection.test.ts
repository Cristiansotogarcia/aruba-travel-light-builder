import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  buildCollectionSignaturePath,
  completeCollectionTask,
  extractSlipId,
  getCollectionReceiptDisplayNumber,
} from './collection';

const { rpcFn } = vi.hoisted(() => ({ rpcFn: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcFn },
}));

describe('buildCollectionSignaturePath', () => {
  it('builds the bucket path under the booking and task', () => {
    expect(buildCollectionSignaturePath('booking-1', 'task-2', 1700000000000)).toBe(
      'bookings/booking-1/tasks/task-2/collection-signature-1700000000000.png',
    );
  });

  it('defaults the timestamp to now', () => {
    const before = Date.now();
    const path = buildCollectionSignaturePath('b', 't');
    const after = Date.now();

    const match = path.match(/^bookings\/b\/tasks\/t\/collection-signature-(\d+)\.png$/);
    expect(match).not.toBeNull();
    const stamp = Number(match![1]);
    expect(stamp).toBeGreaterThanOrEqual(before);
    expect(stamp).toBeLessThanOrEqual(after);
  });
});

describe('getCollectionReceiptDisplayNumber', () => {
  it('prefers the stored receipt number', () => {
    expect(getCollectionReceiptDisplayNumber('COL-001234', 'abcdef12-3456')).toBe('COL-001234');
  });

  it('falls back to a COL- prefix from the id', () => {
    expect(getCollectionReceiptDisplayNumber(null, 'abcdef12-3456-7890')).toBe('COL-ABCDEF12');
    expect(getCollectionReceiptDisplayNumber('   ', 'abcdef12-3456-7890')).toBe('COL-ABCDEF12');
  });
});

describe('extractSlipId', () => {
  it('returns the slip id from a completion payload', () => {
    expect(extractSlipId({ slip_id: 'slip-9' })).toBe('slip-9');
  });

  it('returns null for missing or malformed payloads', () => {
    expect(extractSlipId(null)).toBeNull();
    expect(extractSlipId(undefined)).toBeNull();
    expect(extractSlipId('nope')).toBeNull();
    expect(extractSlipId({})).toBeNull();
    expect(extractSlipId({ slip_id: null })).toBeNull();
    expect(extractSlipId({ slip_id: '' })).toBeNull();
    expect(extractSlipId({ slip_id: 42 })).toBeNull();
  });
});

describe('completeCollectionTask', () => {
  beforeEach(() => {
    rpcFn.mockReset();
  });

  it('invokes the RPC with mapped parameters and returns the slip id', async () => {
    rpcFn.mockResolvedValue({ data: { slip_id: 'receipt-1' }, error: null });

    const result = await completeCollectionTask({
      taskId: 'task-1',
      signedByName: 'Jane Doe',
      signaturePath: 'bookings/b/tasks/t/collection-signature-1.png',
      conditionNotes: 'Stroller wheel scuffed',
      notes: 'Left at front desk',
    });

    expect(rpcFn).toHaveBeenCalledWith('complete_collection_task', {
      p_task_id: 'task-1',
      p_signed_by_name: 'Jane Doe',
      p_signature_path: 'bookings/b/tasks/t/collection-signature-1.png',
      p_condition_notes: 'Stroller wheel scuffed',
      p_notes: 'Left at front desk',
    });
    expect(result.slipId).toBe('receipt-1');
  });

  it('omits optional fields when not provided', async () => {
    rpcFn.mockResolvedValue({ data: { slip_id: 'receipt-2' }, error: null });

    await completeCollectionTask({
      taskId: 'task-2',
      signedByName: 'John',
      signaturePath: 'path.png',
    });

    expect(rpcFn).toHaveBeenCalledWith('complete_collection_task', {
      p_task_id: 'task-2',
      p_signed_by_name: 'John',
      p_signature_path: 'path.png',
      p_condition_notes: undefined,
      p_notes: undefined,
    });
  });

  it('throws when the RPC returns an error', async () => {
    rpcFn.mockResolvedValue({ data: null, error: { message: 'no permission' } });

    await expect(
      completeCollectionTask({
        taskId: 'task-3',
        signedByName: 'John',
        signaturePath: 'path.png',
      }),
    ).rejects.toThrow('no permission');
  });
});
