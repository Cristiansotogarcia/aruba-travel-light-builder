import { Booking, BookingStatus } from './calendar/types';
interface BookingSquareCardProps {
    booking: Booking;
    onView: (booking: Booking) => void;
    onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void;
    onEdit: (booking: Booking) => void;
}
export declare const BookingSquareCard: ({ booking, onView, onStatusUpdate, onEdit }: BookingSquareCardProps) => import("react/jsx-runtime").JSX.Element;
export {};
