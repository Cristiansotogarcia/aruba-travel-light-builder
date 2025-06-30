import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, ArrowLeft, ChevronDown } from 'lucide-react';
export const BookingFilters = ({ searchTerm, onSearchChange, statusFilter, onStatusFilterChange, showListView, onReturnToCalendar, calendarView, onCalendarViewChange }) => {
    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'out_for_delivery', label: 'Out for Delivery' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
    ];
    const currentStatusLabel = statusOptions.find(option => option.value === statusFilter)?.label || 'All Statuses';
    return (_jsxs("div", { className: "flex flex-wrap gap-4 items-start justify-between", children: [_jsxs("div", { className: "flex gap-4 flex-wrap flex-1", children: [_jsx("div", { className: "flex-1 min-w-64", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" }), _jsx(Input, { placeholder: "Search by name, email, or booking ID...", value: searchTerm, onChange: (e) => onSearchChange(e.target.value), className: "pl-10" })] }) }), !showListView && (_jsx("div", { className: "flex items-center gap-2", children: _jsxs(ToggleGroup, { value: calendarView, onValueChange: (value) => value && onCalendarViewChange(value), type: "single", children: [_jsx(ToggleGroupItem, { value: "day", children: "Day" }), _jsx(ToggleGroupItem, { value: "week", children: "Week" })] }) }))] }), showListView && (_jsxs("div", { className: "flex flex-col gap-2 items-end", children: [_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: "h-10 px-3 py-2 w-[180px] justify-between", children: [currentStatusLabel, _jsx(ChevronDown, { className: "h-4 w-4" })] }) }), _jsx(DropdownMenuContent, { align: "end", className: "w-[180px]", children: statusOptions.map((option) => (_jsx(DropdownMenuItem, { onClick: () => onStatusFilterChange(option.value), className: statusFilter === option.value ? 'bg-accent' : '', children: option.label }, option.value))) })] }), _jsxs(Button, { variant: "outline", onClick: onReturnToCalendar, className: "h-10 px-3 py-2 w-[180px] flex items-center gap-2", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Return to calendar"] })] }))] }));
};
