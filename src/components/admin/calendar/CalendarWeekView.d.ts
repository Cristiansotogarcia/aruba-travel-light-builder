import { Booking } from '@/components/admin/calendar/types';
interface CalendarWeekViewProps {
    bookings: Booking[];
    currentDate: Date;
    onDayClick: (date: Date) => void;
}
export declare const CalendarWeekView: ({ bookings, currentDate, onDayClick }: CalendarWeekViewProps) => import("react/jsx-runtime").JSX.Element;
export {};
