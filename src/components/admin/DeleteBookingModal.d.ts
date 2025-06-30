import { Booking } from './calendar/types';
interface DeleteBookingModalProps {
    booking: Booking;
    onBookingDeleted: () => void;
    onClose: () => void;
    open: boolean;
}
export declare const DeleteBookingModal: ({ booking, onBookingDeleted, onClose, open }: DeleteBookingModalProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
