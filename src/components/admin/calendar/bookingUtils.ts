
import { Booking } from './types';
import { isSameDay } from 'date-fns';

export interface BookingsByType {
  deliveries: Booking[];
  pickups: Booking[];
}

export const getDeliveriesForDate = (bookings: Booking[], date: Date): Booking[] => {
  return bookings.filter(booking => 
    isSameDay(new Date(booking.start_date), date) && 
    booking.status !== 'undeliverable' // Exclude undeliverable bookings from calendar
  );
};

export const getPickupsForDate = (bookings: Booking[], date: Date): Booking[] => {
  return bookings.filter(booking => 
    isSameDay(new Date(booking.end_date), date) &&
    booking.status !== 'undeliverable' // Exclude undeliverable bookings from calendar
  );
};

export const getBookingsByTypeForDate = (bookings: Booking[], date: Date): BookingsByType => {
  return {
    deliveries: getDeliveriesForDate(bookings, date),
    pickups: getPickupsForDate(bookings, date)
  };
};

export const getTotalCountsForDate = (bookings: Booking[], date: Date) => {
  const { deliveries, pickups } = getBookingsByTypeForDate(bookings, date);
  return {
    deliveryCount: deliveries.length,
    pickupCount: pickups.length,
    totalCount: deliveries.length + pickups.length
  };
};
