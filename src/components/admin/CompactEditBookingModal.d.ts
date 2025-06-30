import { Booking } from './edit-booking/types';
interface CompactEditBookingModalProps {
    booking: Booking;
    onBookingUpdated: () => void;
    onClose: () => void;
    open: boolean;
}
export declare const CompactEditBookingModal: ({ booking, onBookingUpdated, onClose, open }: CompactEditBookingModalProps) => import("react/jsx-runtime").JSX.Element;
export {};
