interface BookingFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    showListView: boolean;
    onReturnToCalendar: () => void;
    calendarView: 'day' | 'week';
    onCalendarViewChange: (value: 'day' | 'week') => void;
}
export declare const BookingFilters: ({ searchTerm, onSearchChange, statusFilter, onStatusFilterChange, showListView, onReturnToCalendar, calendarView, onCalendarViewChange }: BookingFiltersProps) => import("react/jsx-runtime").JSX.Element;
export {};
