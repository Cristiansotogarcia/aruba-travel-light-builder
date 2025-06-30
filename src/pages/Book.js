import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookingForm } from '@/components/booking/BookingForm';
import { QuickBooking } from '@/components/booking/QuickBooking';
const Book = () => {
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [_jsx(Header, {}), _jsx("main", { className: "flex-1 bg-gray-50", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16", children: [_jsxs("div", { className: "text-center mb-12", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-4", children: "Book Your Equipment" }), _jsx("p", { className: "text-xl text-gray-600 max-w-2xl mx-auto", children: "Select your rental dates, choose your equipment, and we'll deliver everything to your location in Aruba" })] }), _jsxs("div", { className: "grid lg:grid-cols-4 gap-8", children: [_jsx("div", { className: "lg:col-span-3", children: _jsx(BookingForm, {}) }), _jsx("div", { className: "lg:col-span-1", children: _jsx(QuickBooking, {}) })] })] }) }), _jsx(Footer, {})] }));
};
export default Book;
