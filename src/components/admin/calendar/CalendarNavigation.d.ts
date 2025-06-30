interface CalendarNavigationProps {
    currentDate: Date;
    viewMode: 'day' | 'week';
    onNavigate: (direction: 'prev' | 'next') => void;
    onToday: () => void;
}
export declare const CalendarNavigation: ({ currentDate, viewMode, onNavigate, onToday }: CalendarNavigationProps) => import("react/jsx-runtime").JSX.Element;
export {};
