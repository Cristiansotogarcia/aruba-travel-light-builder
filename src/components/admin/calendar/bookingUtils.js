import { isSameDay } from 'date-fns';
export const getDeliveriesForDate = (bookings, date) => {
    return bookings.filter(booking => isSameDay(new Date(booking.start_date), date) &&
        booking.status !== 'undeliverable' // Exclude undeliverable bookings from calendar
    );
};
export const getPickupsForDate = (bookings, date) => {
    return bookings.filter(booking => isSameDay(new Date(booking.end_date), date) &&
        booking.status !== 'undeliverable' // Exclude undeliverable bookings from calendar
    );
};
export const getBookingsByTypeForDate = (bookings, date) => {
    return {
        deliveries: getDeliveriesForDate(bookings, date),
        pickups: getPickupsForDate(bookings, date)
    };
};
export const getTotalCountsForDate = (bookings, date) => {
    const { deliveries, pickups } = getBookingsByTypeForDate(bookings, date);
    return {
        deliveryCount: deliveries.length,
        pickupCount: pickups.length,
        totalCount: deliveries.length + pickups.length
    };
};
