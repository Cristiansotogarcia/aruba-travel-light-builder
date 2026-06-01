// src/lib/queries/availability.ts
import { supabase } from '@/integrations/supabase/client';

export type AvailabilityMap = Record<string, number>;

export async function getEquipmentAvailability(
  start: string,
  end: string,
  equipmentIds: string[] | null = null,
): Promise<AvailabilityMap> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_equipment_availability', {
    p_start: start,
    p_end: end,
    p_equipment_ids: equipmentIds,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ equipment_id: string; available_units: number }>;
  return rows.reduce<AvailabilityMap>((acc, r) => {
    acc[r.equipment_id] = r.available_units;
    return acc;
  }, {});
}
