import { Booking, BookingStatus } from './calendar/types';
interface BookingsListViewProps {
    bookings: Booking[];
    onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void;
    onEdit: (booking: Booking) => void;
    onView: (booking: Booking) => void;
    searchTerm: string;
    statusFilter: string;
}
export declare const BookingsListView: ({ bookings, onStatusUpdate, onEdit, onView, searchTerm, statusFilter }: BookingsListViewProps) => import("react/jsx-runtime").JSX.Element;
export {};
