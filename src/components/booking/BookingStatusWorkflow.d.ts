import React from 'react';
import { Booking, BookingStatus } from '@/types/types';
export declare function BookingStatusDisplay({ bookingId }: {
    bookingId: string;
}): import("react/jsx-runtime").JSX.Element;
interface BookingStatusWorkflowProps {
    booking: Booking | null;
    onUpdate: (bookingId: string, newStatus: BookingStatus) => void;
    availableStatuses: BookingStatus[];
}
export declare const BookingStatusWorkflow: React.FC<BookingStatusWorkflowProps>;
export {};
