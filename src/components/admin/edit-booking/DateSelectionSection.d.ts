interface DateSelectionSectionProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
}
export declare const DateSelectionSection: ({ startDate, endDate, onStartDateChange, onEndDateChange }: DateSelectionSectionProps) => import("react/jsx-runtime").JSX.Element;
export {};
