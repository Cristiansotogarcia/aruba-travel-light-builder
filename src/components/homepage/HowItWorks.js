import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
const steps = [
    {
    step: "1",
    title: "Browse Our Selection",
    description: "🧺 Explore our wide range of Beach and Baby Equipment online and pick what you need for your stay."
  },
 {
  step: "2",
  title: "Send Us Your Info",
  description: "📧 Email info@travelightaruba.com with:\n• Full Name\n• Phone Number\n• Rental Dates\n• Preferred Delivery & Pickup Time Slots\n• Accommodation Address"
},
 {
    step: "3",
    title: "Confirm & Pay",
    description: "✅ We'll check availability, confirm your order, and send you a secure payment link to complete your booking."
  },
  {
    step: "4",
    title: "Delivery & Pickup",
    description: "🚗 We deliver your equipment directly to your hotel or vacation rental and pick it up when you're done."
  },
  {
    step: "5",
    title: "Enjoy Your Vacation",
    description: "🌞 Relax and enjoy Aruba with everything you need right at your fingertips."
  }
];
export const HowItWorks = () => {
    return (_jsx("section", { className: "py-16 bg-white", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "text-center mb-12", children: [_jsx("h2", { className: "text-3xl md:text-4xl font-bold text-gray-900 mb-4", children: "How It Works" }), _jsx("p", { className: "text-xl text-gray-600 max-w-2xl mx-auto", children: "Renting beach and baby gear has never been easier. Just follow these simple steps:" })] }), _jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-4 gap-8", children: steps.map((step, index) => (_jsxs(Card, { className: "text-center border-2 hover:border-blue-200 transition-colors", children: [_jsxs(CardHeader, { children: [_jsx("div", { className: "w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4", children: step.step }), _jsx(CardTitle, { className: "text-lg", children: step.title })] }), _jsx(CardContent, { children: _jsx("p", { className: "text-gray-600", children: step.description }) })] }, index))) })] }) }));
};
