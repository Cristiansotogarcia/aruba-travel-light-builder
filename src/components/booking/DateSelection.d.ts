interface DateSelectionProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
}
export declare const DateSelection: ({ startDate, endDate, onStartDateChange, onEndDateChange }: DateSelectionProps) => import("react/jsx-runtime").JSX.Element;
export {};
