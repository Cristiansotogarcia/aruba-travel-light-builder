import { useQuery } from '@tanstack/react-query';
import { getEquipmentAvailability, type AvailabilityMap } from '@/lib/queries/availability';
import { isValidRange } from '@/lib/rentalDates';

// Returns an equipmentId->availableUnits map for the given range, or stays disabled when no valid range is set.
export function useAvailability(startDate: string | null, endDate: string | null) {
  const enabled = isValidRange(startDate, endDate);
  return useQuery<AvailabilityMap>({
    queryKey: ['equipment-availability', startDate, endDate],
    queryFn: () => getEquipmentAvailability(startDate as string, endDate as string),
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
