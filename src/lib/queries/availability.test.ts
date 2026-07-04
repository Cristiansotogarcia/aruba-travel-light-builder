// src/lib/queries/availability.test.ts
import { describe, it, expect, vi } from 'vitest';

const { rpcFn } = vi.hoisted(() => ({ rpcFn: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: rpcFn } }));

import { getEquipmentAvailability } from './availability';

describe('getEquipmentAvailability', () => {
  it('calls the RPC and returns an id-to-units map', async () => {
    rpcFn.mockResolvedValue({ data: [{ equipment_id: 'a', available_units: 2 }, { equipment_id: 'b', available_units: 0 }], error: null });
    const map = await getEquipmentAvailability('2027-01-10', '2027-01-14');
    expect(rpcFn).toHaveBeenCalledWith('get_equipment_availability', { p_start: '2027-01-10', p_end: '2027-01-14', p_equipment_ids: null });
    expect(map).toEqual({ a: 2, b: 0 });
  });
  it('throws on RPC error', async () => {
    rpcFn.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(getEquipmentAvailability('2027-01-10', '2027-01-14')).rejects.toThrow('boom');
  });
});
