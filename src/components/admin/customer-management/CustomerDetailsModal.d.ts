import { Booking } from '@/lib/queries/types';
interface Customer extends Booking {
    bookings: Booking[];
    total_spent: number;
    last_booking: string;
}
interface CustomerDetailsModalProps {
    open: boolean;
    onClose: () => void;
    customer: Customer | null;
    onCustomerUpdated: () => void;
    onNavigateToBooking?: (bookingId: string) => void;
}
export declare const CustomerDetailsModal: ({ open, onClose, customer, onCustomerUpdated, onNavigateToBooking }: CustomerDetailsModalProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
