import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
const Contact = () => {
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [_jsx(Header, {}), _jsx("main", { className: "flex-1 bg-gray-50", children: _jsxs("div", { className: "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-6", children: "Contact Us" }), _jsx("p", { className: "text-lg text-gray-700 mb-4", children: "We'd love to hear from you. Reach out using the information below." }), _jsxs("div", { className: "space-y-2 text-gray-800", children: [_jsx("p", { children: "To make a reservation for rentals, please send us an e-mail to:" }), _jsxs("p", { children: ["\uD83D\uDCE7 ", _jsx("a", { href: "mailto:info@travelightaruba.com", className: "text-blue-600 hover:underline", children: "info@travelightaruba.com" })] })] })] }) }), _jsx(Footer, {})] }));
};
export default Contact;
