import { Booking, BookingStatus } from './calendar/types';
interface BookingActionButtonsProps {
    booking: Booking;
    onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void;
    onEdit: (booking: Booking) => void;
    onShowDeleteModal: () => void;
    onShowUndeliverableModal: () => void;
    onClose: () => void;
}
export declare const BookingActionButtons: ({ booking, onStatusUpdate, onEdit, onShowDeleteModal, onShowUndeliverableModal, onClose }: BookingActionButtonsProps) => import("react/jsx-runtime").JSX.Element;
export {};
