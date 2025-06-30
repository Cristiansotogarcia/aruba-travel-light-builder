import { Booking } from './calendar/types';
interface UndeliverableModalProps {
    open: boolean;
    onClose: () => void;
    booking: Booking;
    onMarkUndeliverable: (bookingId: string, reason: string) => void;
}
export declare const UndeliverableModal: ({ open, onClose, booking, onMarkUndeliverable }: UndeliverableModalProps) => import("react/jsx-runtime").JSX.Element;
export {};
