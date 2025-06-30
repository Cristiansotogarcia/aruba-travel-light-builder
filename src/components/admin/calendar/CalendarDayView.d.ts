import { Booking } from '@/components/admin/calendar/types';
interface CalendarDayViewProps {
    bookings: Booking[];
    currentDate: Date;
}
export declare const CalendarDayView: ({ bookings, currentDate }: CalendarDayViewProps) => import("react/jsx-runtime").JSX.Element;
export {};
