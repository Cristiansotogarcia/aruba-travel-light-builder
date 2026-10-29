import { describe, it, expect } from 'vitest';
import { groupTodayBoard, availableActions, type TodayBoardBooking } from './todayBoard';

const TODAY = '2026-10-29';

const makeBooking = (overrides: Partial<TodayBoardBooking>): TodayBoardBooking => ({
  booking_id: 'b1',
  pickup_code: 'ABC123',
  customer_name: 'Jane Doe',
  customer_phone: '555-1234',
  customer_email: 'jane@example.com',
  start_date: TODAY,
  end_date: TODAY,
  status: 'confirmed',
  fulfillment_method: 'pickup',
  total_amount: 100,
  items: [{ equipment_name: 'Stroller', quantity: 1 }],
  outbound_done: false,
  return_done: false,
  ...overrides,
});

describe('groupTodayBoard', () => {
  it('buckets a Store Pickup due today, not yet handed over', () => {
    const booking = makeBooking({ fulfillment_method: 'pickup', start_date: TODAY, end_date: '2026-11-02' });
    const board = groupTodayBoard([booking], TODAY);
    expect(board.storePickups).toEqual([booking]);
    expect(board.storeReturns).toEqual([]);
    expect(board.deliveriesOut).toEqual([]);
    expect(board.collectionsIn).toEqual([]);
  });

  it('buckets a Store Return due today, handed over but not checked in', () => {
    const booking = makeBooking({
      fulfillment_method: 'pickup',
      start_date: '2026-10-25',
      end_date: TODAY,
      outbound_done: true,
      return_done: false,
    });
    const board = groupTodayBoard([booking], TODAY);
    expect(board.storeReturns).toEqual([booking]);
    expect(board.storePickups).toEqual([]);
  });

  it('buckets a Delivery out today under deliveriesOut, not storePickups', () => {
    const booking = makeBooking({ fulfillment_method: 'delivery', start_date: TODAY, end_date: '2026-11-02' });
    const board = groupTodayBoard([booking], TODAY);
    expect(board.deliveriesOut).toEqual([booking]);
    expect(board.storePickups).toEqual([]);
  });

  it('buckets a Collection in today under collectionsIn, not storeReturns', () => {
    const booking = makeBooking({
      fulfillment_method: 'delivery',
      start_date: '2026-10-25',
      end_date: TODAY,
      outbound_done: true,
    });
    const board = groupTodayBoard([booking], TODAY);
    expect(board.collectionsIn).toEqual([booking]);
    expect(board.storeReturns).toEqual([]);
  });

  it('drops a leg that is already done off the board', () => {
    const handedOver = makeBooking({
      booking_id: 'handed-over',
      start_date: TODAY,
      end_date: '2026-11-05',
      outbound_done: true,
    });
    const returned = makeBooking({
      booking_id: 'returned',
      start_date: '2026-10-20',
      end_date: TODAY,
      return_done: true,
    });
    const board = groupTodayBoard([handedOver, returned], TODAY);
    expect(board.storePickups).toEqual([]);
    expect(board.storeReturns).toEqual([]);
  });

  it('a same-day rental appears in both its outbound and return bucket', () => {
    const sameDay = makeBooking({ start_date: TODAY, end_date: TODAY });
    const board = groupTodayBoard([sameDay], TODAY);
    expect(board.storePickups).toEqual([sameDay]);
    expect(board.storeReturns).toEqual([sameDay]);
  });

  it('ignores bookings not due today in either leg', () => {
    const future = makeBooking({ start_date: '2026-11-05', end_date: '2026-11-08' });
    const board = groupTodayBoard([future], TODAY);
    expect(board.storePickups).toEqual([]);
    expect(board.storeReturns).toEqual([]);
    expect(board.deliveriesOut).toEqual([]);
    expect(board.collectionsIn).toEqual([]);
  });

  it('returns an empty board for an empty input', () => {
    const board = groupTodayBoard([], TODAY);
    expect(board).toEqual({ storePickups: [], storeReturns: [], deliveriesOut: [], collectionsIn: [] });
  });
});

describe('availableActions', () => {
  it('offers handover, extend and refund in storePickups', () => {
    expect(availableActions('storePickups')).toEqual(['handover', 'extend', 'refund']);
  });

  it('offers return, extend and refund in storeReturns', () => {
    expect(availableActions('storeReturns')).toEqual(['return', 'extend', 'refund']);
  });

  it('offers only extend and refund for driver-executed buckets', () => {
    expect(availableActions('deliveriesOut')).toEqual(['extend', 'refund']);
    expect(availableActions('collectionsIn')).toEqual(['extend', 'refund']);
  });
});
