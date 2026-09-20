import { describe, expect, it } from 'vitest';
import { getEquipmentAvailability } from './equipmentAvailability';

describe('getEquipmentAvailability', () => {
  it('keeps low stock products available unless Low Stock is selected', () => {
    expect(
      getEquipmentAvailability({
        stockQuantity: 1,
        availabilityStatus: 'Available',
      })
    ).toBe('available');
  });

  it('shows the limited badge only for explicit Low Stock products', () => {
    expect(
      getEquipmentAvailability({
        stockQuantity: 20,
        availabilityStatus: 'Low Stock',
      })
    ).toBe('limited');
  });

  it('keeps zero-stock and unavailable statuses unavailable', () => {
    expect(
      getEquipmentAvailability({
        stockQuantity: 0,
        availabilityStatus: 'Low Stock',
      })
    ).toBe('unavailable');

    expect(
      getEquipmentAvailability({
        stockQuantity: 5,
        availabilityStatus: 'Temporarily Not Available',
      })
    ).toBe('unavailable');
  });
});