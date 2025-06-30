import { BookingItem } from '@/components/admin/calendar/types';
interface BookingSummarySectionProps {
    startDate: string;
    endDate: string;
    bookingItems: BookingItem[];
    discount: number;
    loading: boolean;
    isUndeliverable: boolean;
    onDiscountChange: (discount: number) => void;
    onSubmit: () => void;
    onCancel: () => void;
}
export declare const BookingSummarySection: ({ startDate, endDate, bookingItems, discount, loading, isUndeliverable, onDiscountChange, onSubmit, onCancel }: BookingSummarySectionProps) => import("react/jsx-runtime").JSX.Element;
export {};
