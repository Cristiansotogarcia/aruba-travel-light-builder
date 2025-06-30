import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
export const CalendarNavigation = ({ currentDate, viewMode, onNavigate, onToday }) => {
    const getTitle = () => {
        if (viewMode === 'day') {
            return format(currentDate, 'EEEE, dd/MM/yyyy');
        }
        else {
            return `Week of ${format(currentDate, 'dd/MM/yyyy')}`;
        }
    };
    return (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => onNavigate('prev'), children: _jsx(ChevronLeft, { className: "h-4 w-4" }) }), _jsx("h2", { className: "text-xl font-semibold", children: getTitle() }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => onNavigate('next'), children: _jsx(ChevronRight, { className: "h-4 w-4" }) })] }), _jsx(Button, { variant: "outline", onClick: onToday, children: "Return to today" })] }));
};
