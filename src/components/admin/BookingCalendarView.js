import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { addDays, addWeeks, subWeeks } from 'date-fns';
import { BookingViewModal } from './BookingViewModal';
import { CalendarNavigation } from './calendar/CalendarNavigation';
import { CalendarDayView } from './calendar/CalendarDayView';
import { CalendarWeekView } from './calendar/CalendarWeekView';
import { DayPopupDialog } from './calendar/DayPopupDialog';
export const BookingCalendarView = ({ bookings, viewMode, onStatusUpdate, onCreateBooking, onEdit }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showDayPopup, setShowDayPopup] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewingBooking, setViewingBooking] = useState(null);
    const navigateDate = (direction) => {
        if (viewMode === 'day') {
            setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : addDays(prev, -1));
        }
        else {
            setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
        }
    };
    const handleDayClick = (date) => {
        setSelectedDate(date);
        setShowDayPopup(true);
    };
    const handleReturnToToday = () => {
        setCurrentDate(new Date());
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-4", children: [_jsx(CalendarNavigation, { currentDate: currentDate, viewMode: viewMode, onNavigate: navigateDate, onToday: handleReturnToToday }), viewMode === 'day' ? (_jsx(CalendarDayView, { bookings: bookings, currentDate: currentDate })) : (_jsx(CalendarWeekView, { bookings: bookings, currentDate: currentDate, onDayClick: handleDayClick }))] }), _jsx(DayPopupDialog, { isOpen: showDayPopup, onClose: () => setShowDayPopup(false), selectedDate: selectedDate, bookings: bookings, onCreateBooking: onCreateBooking, onViewBooking: setViewingBooking }), viewingBooking && (_jsx(BookingViewModal, { booking: viewingBooking, onClose: () => setViewingBooking(null), onStatusUpdate: onStatusUpdate, onEdit: onEdit, open: !!viewingBooking }))] }));
};
