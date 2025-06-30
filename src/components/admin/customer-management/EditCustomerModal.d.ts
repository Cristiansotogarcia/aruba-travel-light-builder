import { Booking } from '@/lib/queries/types';
interface Customer extends Booking {
    bookings: Booking[];
    total_spent: number;
    last_booking: string;
}
interface EditCustomerModalProps {
    open: boolean;
    onClose: () => void;
    customer: Customer | null;
    onCustomerUpdated: () => void;
}
export declare const EditCustomerModal: ({ open, onClose, customer, onCustomerUpdated }: EditCustomerModalProps) => import("react/jsx-runtime").JSX.Element;
export {};
