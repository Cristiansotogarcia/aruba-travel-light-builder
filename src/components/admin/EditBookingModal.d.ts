import { Booking } from './calendar/types';
interface EditBookingModalProps {
    booking: Booking;
    onBookingUpdated: () => void;
    onClose: () => void;
    open: boolean;
}
export declare const EditBookingModal: ({ booking, onBookingUpdated, onClose, open }: EditBookingModalProps) => import("react/jsx-runtime").JSX.Element;
export {};
