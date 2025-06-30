import { Booking } from './calendar/types';
interface BookingCardProps {
    booking: Booking;
    onEdit: (booking: Booking) => void;
    onView: (booking: Booking) => void;
    onStatusUpdate: (bookingId: string, status: string) => void;
}
export declare const BookingCard: ({ booking, onStatusUpdate, onEdit, onView }: BookingCardProps) => import("react/jsx-runtime").JSX.Element;
export {};
