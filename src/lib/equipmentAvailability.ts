import type { AvailabilityStatus } from '@/types/types';

export type EquipmentAvailability = 'available' | 'limited' | 'unavailable';

interface EquipmentAvailabilityInput {
  stockQuantity?: number | null;
  availabilityStatus?: AvailabilityStatus | string | null;
}

export const getEquipmentAvailability = ({
  stockQuantity,
  availabilityStatus,
}: EquipmentAvailabilityInput): EquipmentAvailability => {
  if (
    availabilityStatus === 'Out of Stock' ||
    availabilityStatus === 'Temporarily Not Available' ||
    (stockQuantity ?? 0) <= 0
  ) {
    return 'unavailable';
  }

  return availabilityStatus === 'Low Stock' ? 'limited' : 'available';
};