import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Phone, Calendar, Search } from 'lucide-react';
import { CustomerDetailsModal } from './customer-management/CustomerDetailsModal';
export const CustomersList = () => {
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const { toast } = useToast();
    useEffect(() => {
        fetchCustomers();
    }, []);
    useEffect(() => {
        filterCustomers();
    }, [customers, searchTerm]);
    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*');
            if (error)
                throw error;
            // Group bookings by customer email
            const customerMap = new Map();
            data?.forEach((booking) => {
                const email = booking.customer_email;
                if (!customerMap.has(email)) {
                    customerMap.set(email, {
                        customer_email: email,
                        customer_name: booking.customer_name,
                        customer_phone: booking.customer_phone,
                        customer_address: booking.customer_address,
                        bookings: [],
                        total_spent: 0,
                        last_booking: booking.created_at,
                    });
                }
                const customer = customerMap.get(email);
                customer.bookings.push(booking);
                customer.total_spent += Number(booking.total_amount);
                // Update last booking date if this one is more recent
                if (new Date(booking.created_at) > new Date(customer.last_booking)) {
                    customer.last_booking = booking.created_at;
                }
            });
            const customersList = Array.from(customerMap.values())
                .sort((a, b) => new Date(b.last_booking).getTime() - new Date(a.last_booking).getTime());
            setCustomers(customersList);
        }
        catch (error) {
            console.error('Error fetching customers:', error);
            toast({
                title: "Error",
                description: "Failed to fetch customers data",
                variant: "destructive"
            });
        }
        finally {
            setLoading(false);
        }
    };
    const filterCustomers = () => {
        if (!searchTerm) {
            setFilteredCustomers(customers);
            return;
        }
        const filtered = customers.filter(customer => customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.customer_phone.includes(searchTerm));
        setFilteredCustomers(filtered);
    };
    const handleCustomerClick = (customer) => {
        setSelectedCustomer(customer);
        setDetailsModalOpen(true);
    };
    const handleCustomerUpdated = () => {
        fetchCustomers(); // Refresh the customers list
    };
    const handleNavigateToBooking = (bookingId) => {
        // This would typically navigate to the bookings page with a filter or highlight
        // For now, we'll show a toast indicating the functionality
        toast({
            title: "Navigate to Booking",
            description: `Would navigate to booking ${bookingId} in the bookings list`,
        });
    };
    if (loading) {
        return (_jsx("div", { className: "grid grid-cols-3 gap-4", children: [...Array(6)].map((_, i) => (_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "animate-pulse space-y-4", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-1/2" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-3/4" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-1/4" })] }) }) }, i))) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Customers" }), _jsx("p", { className: "text-gray-600 mt-1", children: "View and manage your customer relationships" })] }), _jsxs(Badge, { variant: "outline", className: "text-lg px-3 py-1", children: [filteredCustomers.length, " customers"] })] }), _jsx(Card, { children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" }), _jsx(Input, { placeholder: "Search customers by name, email, or phone...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10" })] }) }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Total Customers" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: customers.length })] }), _jsx("div", { className: "h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center", children: _jsx(Users, { className: "h-6 w-6 text-blue-600" }) })] }) }) }), _jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Avg. Bookings" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: customers.length > 0 ? (customers.reduce((sum, c) => sum + c.bookings.length, 0) / customers.length).toFixed(1) : '0' })] }), _jsx("div", { className: "h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center", children: _jsx(Calendar, { className: "h-6 w-6 text-green-600" }) })] }) }) }), _jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Avg. Spend" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: ["$", customers.length > 0 ? (customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length).toFixed(0) : '0'] })] }), _jsx("div", { className: "h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center", children: _jsx(Users, { className: "h-6 w-6 text-purple-600" }) })] }) }) })] }), filteredCustomers.length > 0 ? (_jsx("div", { className: "grid grid-cols-3 gap-4", children: filteredCustomers.map((customer) => (_jsx(Card, { className: "cursor-pointer hover:shadow-md transition-shadow", onClick: () => handleCustomerClick(customer), children: _jsxs(CardContent, { className: "p-4 space-y-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm font-medium text-gray-900 truncate", children: customer.customer_name }), _jsx("div", { className: "text-xs text-gray-500 truncate", children: customer.customer_email }), _jsxs("div", { className: "text-xs text-gray-500 flex items-center gap-1", children: [_jsx(Phone, { className: "h-3 w-3" }), customer.customer_phone] })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "text-xs font-medium text-gray-700", children: ["Recent Booking: ", new Date(customer.last_booking).toLocaleDateString()] }), _jsxs("div", { className: "text-xs text-gray-500", children: ["Total: $", customer.total_spent, " \u2022 ", customer.bookings.length, " bookings"] })] })] }) }, customer.customer_email))) })) : (_jsx(Card, { children: _jsxs(CardContent, { className: "p-12 text-center", children: [_jsx(Users, { className: "h-12 w-12 text-gray-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No customers found" }), _jsx("p", { className: "text-gray-500", children: searchTerm
                                ? 'Try adjusting your search criteria.'
                                : 'Customer data will appear here as bookings are made.' })] }) })), _jsx(CustomerDetailsModal, { open: detailsModalOpen, onClose: () => setDetailsModalOpen(false), customer: selectedCustomer, onCustomerUpdated: handleCustomerUpdated, onNavigateToBooking: handleNavigateToBooking })] }));
};
