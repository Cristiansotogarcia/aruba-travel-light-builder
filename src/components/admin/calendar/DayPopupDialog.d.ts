import { Booking } from '@/components/admin/calendar/types';
interface DayPopupDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date | null;
    bookings: Booking[];
    onCreateBooking: () => void;
    onViewBooking: (booking: Booking) => void;
}
export declare const DayPopupDialog: ({ isOpen, onClose, selectedDate, bookings, onCreateBooking, onViewBooking }: DayPopupDialogProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
