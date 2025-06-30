import { Booking } from '@/components/admin/calendar/types';
export interface BookingsByType {
    deliveries: Booking[];
    pickups: Booking[];
}
export declare const getDeliveriesForDate: (bookings: Booking[], date: Date) => Booking[];
export declare const getPickupsForDate: (bookings: Booking[], date: Date) => Booking[];
export declare const getBookingsByTypeForDate: (bookings: Booking[], date: Date) => BookingsByType;
export declare const getTotalCountsForDate: (bookings: Booking[], date: Date) => {
    deliveryCount: number;
    pickupCount: number;
    totalCount: number;
};
