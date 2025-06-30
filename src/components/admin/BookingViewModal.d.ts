import { Booking, BookingStatus } from './calendar/types';
interface BookingViewModalProps {
    booking: Booking;
    onClose: () => void;
    onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void;
    onEdit: (booking: Booking) => void;
    onBookingDeleted?: () => void;
    open: boolean;
}
export declare const BookingViewModal: ({ booking, onClose, onStatusUpdate, onEdit, onBookingDeleted, open }: BookingViewModalProps) => import("react/jsx-runtime").JSX.Element;
export {};
