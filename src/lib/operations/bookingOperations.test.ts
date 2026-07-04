import { describe, expect, it } from 'vitest';

import {
  buildDriverAssignmentUpdate,
  buildDriverTasks,
  buildTaskCompletionUpdate,
  buildTaskStartUpdate,
  canAssignDriver,
  getAssignedDriverId,
  getTaskSchedule,
  isTaskComplete,
  type OperationalBooking,
} from './bookingOperations';

const baseBooking: OperationalBooking = {
  id: 'booking-1',
  customer_name: 'Alice Example',
  customer_email: 'alice@example.com',
  customer_phone: '123456',
  customer_address: 'Palm Beach 1',
  start_date: '2026-03-20T09:00:00.000Z',
  end_date: '2026-03-25T09:00:00.000Z',
  status: 'confirmed',
  payment_status: 'paid',
  total_amount: 125,
  assigned_to: null,
  assigned_driver_id: 'driver-123',
  delivery_failure_reason: null,
  delivery_scheduled_at: null,
  pickup_scheduled_at: null,
  delivered_at: null,
  picked_up_at: null,
  updated_at: '2026-03-14T12:00:00.000Z',
  booking_items: [
    {
      equipment_id: 'eq-1',
      equipment_name: 'Stroller',
      equipment_price: 25,
      quantity: 2,
      subtotal: 50,
    },
  ],
};

describe('bookingOperations', () => {
  it('prefers assigned_driver_id while keeping assigned_to compatibility', () => {
    expect(getAssignedDriverId(baseBooking)).toBe('driver-123');
    expect(getAssignedDriverId({ assigned_driver_id: null, assigned_to: 'driver-legacy' })).toBe('driver-legacy');
  });

  it('falls back to booking dates when explicit task schedules are missing', () => {
    expect(getTaskSchedule(baseBooking, 'delivery')).toBe(baseBooking.start_date);
    expect(getTaskSchedule(baseBooking, 'pickup')).toBe(baseBooking.end_date);
  });

  it('builds assignment updates that keep both driver fields in sync', () => {
    const update = buildDriverAssignmentUpdate('driver-456', {
      deliveryScheduledAt: '2026-03-20T10:00:00.000Z',
      pickupScheduledAt: '2026-03-25T10:00:00.000Z',
      updatedAt: '2026-03-14T12:00:00.000Z',
    });

    expect(update).toMatchObject({
      assigned_driver_id: 'driver-456',
      assigned_to: 'driver-456',
      delivery_scheduled_at: '2026-03-20T10:00:00.000Z',
      pickup_scheduled_at: '2026-03-25T10:00:00.000Z',
    });
  });

  it('maps delivery and pickup completion to different booking updates', () => {
    expect(buildTaskCompletionUpdate('delivery', { occurredAt: '2026-03-20T12:00:00.000Z' })).toMatchObject({
      status: 'delivered',
      delivered_at: '2026-03-20T12:00:00.000Z',
      delivery_failure_reason: null,
    });

    expect(buildTaskCompletionUpdate('delivery', {
      occurredAt: '2026-03-20T12:00:00.000Z',
      failureReason: 'Customer not available',
    })).toMatchObject({
      status: 'undeliverable',
      delivery_failure_reason: 'Customer not available',
    });

    expect(buildTaskCompletionUpdate('pickup', { occurredAt: '2026-03-25T12:00:00.000Z' })).toMatchObject({
      status: 'completed',
      picked_up_at: '2026-03-25T12:00:00.000Z',
    });
  });

  it('builds driver task models with delivery and pickup tasks', () => {
    const tasks = buildDriverTasks(baseBooking);

    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({
      bookingId: 'booking-1',
      taskType: 'delivery',
      assignedDriverId: 'driver-123',
      customerName: 'Alice Example',
    });
    expect(tasks[1]).toMatchObject({
      bookingId: 'booking-1',
      taskType: 'pickup',
      assignedDriverId: 'driver-123',
    });
  });

  it('tracks completion and assignability using the shared lifecycle rules', () => {
    expect(canAssignDriver('confirmed')).toBe(true);
    expect(canAssignDriver('pending')).toBe(false);
    expect(isTaskComplete(baseBooking, 'delivery')).toBe(false);
    expect(isTaskComplete({ status: 'completed', delivered_at: null, picked_up_at: '2026-03-25T12:00:00.000Z' }, 'pickup')).toBe(true);
    expect(buildTaskStartUpdate('delivery', '2026-03-20T08:30:00.000Z')).toMatchObject({
      status: 'out_for_delivery',
      updated_at: '2026-03-20T08:30:00.000Z',
    });
  });
});
