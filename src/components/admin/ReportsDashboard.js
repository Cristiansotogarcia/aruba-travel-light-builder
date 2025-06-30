import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, } from 'recharts';
import { subDays, format, parseISO, eachDayOfInterval, compareAsc, startOfMonth, subMonths, formatDistanceToNow } from 'date-fns'; // Added formatDistanceToNow
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"; // Import Shadcn Table components
export const ReportsDashboard = () => {
    const [bookingTrends, setBookingTrends] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [revenueTrends, setRevenueTrends] = useState([]);
    const [equipmentUtilization, setEquipmentUtilization] = useState([]);
    const [activityLog, setActivityLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Filter states
    const [allProducts, setAllProducts] = useState([]);
    const [selectedDateRange, setSelectedDateRange] = useState({
        from: subDays(new Date(), 29),
        to: new Date(),
    });
    const [selectedProductId, setSelectedProductId] = useState(undefined);
    const [selectedCustomerName, setSelectedCustomerName] = useState("");
    const processBookingDataForTrends = (bookings) => {
        if (!bookings || bookings.length === 0)
            return [];
        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
        const bookingsByDay = {};
        dateRange.forEach(day => {
            bookingsByDay[format(day, 'yyyy-MM-dd')] = 0;
        });
        bookings.forEach(booking => {
            try {
                const bookingStartDate = parseISO(booking.start_date);
                const formattedStartDate = format(bookingStartDate, 'yyyy-MM-dd');
                if (bookingsByDay.hasOwnProperty(formattedStartDate)) {
                    bookingsByDay[formattedStartDate]++;
                }
            }
            catch (e) {
                console.error('Error parsing booking start_date for trends:', booking.start_date, e);
            }
        });
        return Object.entries(bookingsByDay)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
    };
    const processBookingDataForRevenue = (bookings) => {
        if (!bookings || bookings.length === 0) {
            setTotalRevenue(0);
            setRevenueTrends([]);
            return;
        }
        let currentTotalRevenue = 0;
        bookings.forEach(booking => {
            currentTotalRevenue += booking.total_amount || 0;
        });
        setTotalRevenue(currentTotalRevenue);
        // Process revenue trends for the last 12 months
        const monthlyRevenue = {};
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const monthDate = subMonths(today, i);
            const monthKey = format(startOfMonth(monthDate), 'yyyy-MM');
            monthlyRevenue[monthKey] = 0;
        }
        bookings.forEach(booking => {
            try {
                const bookingDate = parseISO(booking.start_date);
                const monthKey = format(startOfMonth(bookingDate), 'yyyy-MM');
                if (monthlyRevenue.hasOwnProperty(monthKey)) {
                    monthlyRevenue[monthKey] += booking.total_amount || 0;
                }
            }
            catch (e) {
                console.error('Error parsing booking start_date for revenue:', booking.start_date, e);
            }
        });
        const trends = Object.entries(monthlyRevenue)
            .map(([month, revenue]) => ({
            month: format(parseISO(month + '-01'), 'MMM yyyy'), // Format for display
            revenue,
        }))
            .sort((a, b) => compareAsc(parseISO(a.month), parseISO(b.month))); // Ensure chronological order
        setRevenueTrends(trends);
    };
    const processDataForEquipmentUtilization = (bookings, products) => {
        if (!bookings || bookings.length === 0 || !products || products.length === 0)
            return [];
        const utilizationMap = {};
        // Initialize map with all product names from the products table
        products.forEach(product => {
            utilizationMap[product.name] = 0;
        });
        // Aggregate booked quantities from booking_items
        bookings.forEach(booking => {
            booking.booking_items?.forEach(item => {
                if (item.equipment_name && utilizationMap.hasOwnProperty(item.equipment_name)) {
                    utilizationMap[item.equipment_name] += item.quantity || 0;
                }
            });
        });
        return Object.entries(utilizationMap)
            .map(([name, bookedQuantity]) => ({ name, bookedQuantity }))
            .sort((a, b) => b.bookedQuantity - a.bookedQuantity); // Sort by most utilized
    };
    const processBookingsForActivityLog = (bookings) => {
        if (!bookings || bookings.length === 0)
            return [];
        const logEntries = [];
        bookings.forEach(booking => {
            // Log booking creation
            logEntries.push({
                id: `${booking.id}_created`,
                timestamp: booking.created_at,
                displayTimestamp: formatDistanceToNow(parseISO(booking.created_at), { addSuffix: true }),
                customerName: booking.customer_name || 'N/A',
                action: 'New Booking Created',
                bookingId: booking.id,
            });
            // Log significant status updates if updated_at is different from created_at
            const significantStatuses = ['confirmed', 'cancelled', 'completed'];
            if (significantStatuses.includes(booking.status) && booking.updated_at && booking.updated_at !== booking.created_at) {
                logEntries.push({
                    id: `${booking.id}_status_${booking.status}`,
                    timestamp: booking.updated_at,
                    displayTimestamp: formatDistanceToNow(parseISO(booking.updated_at), { addSuffix: true }),
                    customerName: booking.customer_name || 'N/A',
                    action: `Booking ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}`,
                    bookingId: booking.id,
                });
            }
        });
        // Sort by actual timestamp descending
        return logEntries.sort((a, b) => compareAsc(parseISO(b.timestamp), parseISO(a.timestamp)));
    };
    const fetchBookingData = async (filters) => {
        setLoading(true);
        setError(null);
        try {
            let bookingsQuery = supabase
                .from('bookings')
                .select('id, start_date, end_date, status, total_amount, customer_name, customer_email, customer_phone, customer_address, created_at, updated_at, booking_items(equipment_name, quantity, equipment_id)') // Added end_date, customer_email, customer_phone, customer_address
                .order('created_at', { ascending: false });
            if (filters.dateRange?.from) {
                bookingsQuery = bookingsQuery.gte('start_date', format(filters.dateRange.from, 'yyyy-MM-dd'));
            }
            if (filters.dateRange?.to) {
                bookingsQuery = bookingsQuery.lte('start_date', format(filters.dateRange.to, 'yyyy-MM-dd'));
            }
            if (filters.customerName) {
                bookingsQuery = bookingsQuery.ilike('customer_name', `%${filters.customerName}%`);
            }
            // Product ID filter needs to be applied after fetching or by joining if possible
            // For now, we fetch all and filter client-side if productId is present, or adjust query if direct relation exists
            const { data: bookingsData, error: bookingsError } = await bookingsQuery;
            if (bookingsError)
                throw bookingsError;
            // Ensure bookingsData is not null and then map, casting status
            let mappedBookings = bookingsData ? bookingsData.map(b => ({
                ...b,
                status: b.status, // Cast status to BookingStatus
                // Ensure booking_items is always an array, even if null/undefined from DB
                booking_items: (b.booking_items || []).map((item) => ({
                    equipment_name: item.equipment_name,
                    quantity: item.quantity,
                    equipment_id: item.equipment_id,
                    equipment_price: item.equipment_price || 0, // Ensure equipment_price exists or provide default
                    subtotal: item.subtotal || 0 // Ensure subtotal exists or provide default
                })),
            })) : [];
            let filteredBookings = mappedBookings;
            if (filters.productId) {
                filteredBookings = mappedBookings.filter(booking => booking.booking_items?.some(item => item.equipment_id === filters.productId));
            }
            const { data: productsData, error: productsError } = await supabase
                .from('equipment')
                .select('*'); // Select all columns including stock_quantity
            if (productsError)
                throw productsError;
            // Ensure productsData is an array before mapping and conforms to Product[] type
            const typedProductsData = (Array.isArray(productsData) ? productsData.map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price_per_day: p.price_per_day,
                category: p.category,
                image_url: p.image_url,
                availability_status: p.availability_status,
                created_at: p.created_at,
                updated_at: p.updated_at,
                stock_quantity: p.stock_quantity ?? 0 // Ensure stock_quantity exists or provide default
            })) : []);
            setAllProducts(typedProductsData);
            setBookingTrends(processBookingDataForTrends(filteredBookings));
            processBookingDataForRevenue(filteredBookings);
            setEquipmentUtilization(processDataForEquipmentUtilization(filteredBookings, typedProductsData));
            setActivityLog(processBookingsForActivityLog(filteredBookings));
        }
        catch (err) {
            console.error("Error fetching report data:", err);
            setError(err.message || 'Failed to fetch report data.');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchBookingData({
            dateRange: selectedDateRange,
            productId: selectedProductId,
            customerName: selectedCustomerName
        });
        // Subscribe to real-time booking changes
        const bookingsSubscription = supabase
            .channel('public:bookings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
            console.log('Change received for bookings!', payload);
            // Refetch data with current filters when a change occurs
            fetchBookingData({
                dateRange: selectedDateRange,
                productId: selectedProductId,
                customerName: selectedCustomerName
            });
        })
            .subscribe();
        // Cleanup subscription on component unmount
        return () => {
            supabase.removeChannel(bookingsSubscription);
        };
    }, [selectedDateRange, selectedProductId, selectedCustomerName]); // Re-run effect if filters change
    if (loading)
        return _jsx("div", { className: "p-4", children: "Loading reports..." });
    if (error)
        return _jsxs("div", { className: "p-4 text-red-500", children: ["Error: ", error] });
    return (_jsxs("div", { className: "p-4 md:p-8 space-y-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Report Filters" }) }), _jsxs(CardContent, { className: "flex flex-wrap gap-4 items-end", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "date-range", children: "Date Range" }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { id: "date-range", variant: "outline", className: `w-[300px] justify-start text-left font-normal ${!selectedDateRange && "text-muted-foreground"}`, children: [_jsx(CalendarIcon, { className: "mr-2 h-4 w-4" }), selectedDateRange?.from ? (selectedDateRange.to ? (_jsxs(_Fragment, { children: [format(selectedDateRange.from, "LLL dd, y"), " - ", " ", format(selectedDateRange.to, "LLL dd, y")] })) : (format(selectedDateRange.from, "LLL dd, y"))) : (_jsx("span", { children: "Pick a date range" }))] }) }), _jsx(PopoverContent, { className: "w-auto p-0", align: "start", children: _jsx(Calendar, { initialFocus: true, mode: "range", defaultMonth: selectedDateRange?.from, selected: selectedDateRange, onSelect: setSelectedDateRange, numberOfMonths: 2 }) })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "product-filter", children: "Product" }), _jsxs(Select, { value: selectedProductId, onValueChange: setSelectedProductId, children: [_jsx(SelectTrigger, { className: "w-[200px]", id: "product-filter", children: _jsx(SelectValue, { placeholder: "All Products" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: undefined, children: "All Products" }), " ", allProducts.map((product) => (_jsx(SelectItem, { value: product.id.toString(), children: product.name }, product.id)))] })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "customer-filter", children: "Customer Name" }), _jsx(Input, { id: "customer-filter", placeholder: "Search customer...", value: selectedCustomerName, onChange: (e) => setSelectedCustomerName(e.target.value), className: "w-[200px]" })] }), _jsx(Button, { onClick: () => fetchBookingData({ dateRange: selectedDateRange, productId: selectedProductId, customerName: selectedCustomerName }), children: "Apply Filters" })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Booking Trends Analysis (Last 30 Days)" }) }), _jsxs(CardContent, { children: [loading && _jsx("p", { children: "Loading booking trends..." }), error && _jsxs("p", { className: "text-red-500", children: ["Error: ", error] }), !loading && !error && bookingTrends.length === 0 && _jsx("p", { children: "No booking data available for trends." }), !loading && !error && bookingTrends.length > 0 && (_jsx("div", { style: { width: '100%', height: 300 }, children: _jsx(ResponsiveContainer, { children: _jsxs(LineChart, { data: bookingTrends, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "date", tickFormatter: (tick) => format(parseISO(tick), 'MMM d') }), _jsx(YAxis, { allowDecimals: false }), _jsx(Tooltip, {}), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "count", stroke: "#8884d8", name: "Bookings" })] }) }) }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Revenue Reports" }) }), _jsxs(CardContent, { children: [loading && _jsx("p", { children: "Loading revenue data..." }), error && _jsxs("p", { className: "text-red-500", children: ["Error: ", error] }), !loading && !error && (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { children: _jsxs("h3", { className: "text-2xl font-semibold", children: ["Total Revenue: $", totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })] }) }), revenueTrends.length === 0 && _jsx("p", { children: "No revenue data available for trends." }), revenueTrends.length > 0 && (_jsxs("div", { children: [_jsx("h4", { className: "text-lg font-semibold mb-2", children: "Monthly Revenue (Last 12 Months)" }), _jsx("div", { style: { width: '100%', height: 300 }, children: _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: revenueTrends, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "month" }), _jsx(YAxis, {}), _jsx(Tooltip, { formatter: (value) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue'] }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "revenue", fill: "#82ca9d", name: "Monthly Revenue" })] }) }) })] }))] }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Equipment Utilization" }) }), _jsxs(CardContent, { children: [loading && _jsx("p", { children: "Loading equipment utilization data..." }), error && _jsxs("p", { className: "text-red-500", children: ["Error: ", error] }), !loading && !error && equipmentUtilization.length === 0 && _jsx("p", { children: "No equipment utilization data available." }), !loading && !error && equipmentUtilization.length > 0 && (_jsxs("div", { style: { width: '100%', height: 400 }, children: [" ", _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: equipmentUtilization, layout: "vertical", margin: { top: 5, right: 30, left: 100, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { type: "number" }), _jsx(YAxis, { dataKey: "name", type: "category", width: 150, interval: 0 }), _jsx(Tooltip, { formatter: (value) => [value, 'Times Booked'] }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "bookedQuantity", fill: "#8884d8", name: "Total Quantity Booked" })] }) })] }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Customer Activity Log" }) }), _jsxs(CardContent, { children: [loading && _jsx("p", { children: "Loading activity log..." }), error && _jsxs("p", { className: "text-red-500", children: ["Error: ", error] }), !loading && !error && activityLog.length === 0 && _jsx("p", { children: "No customer activity to display." }), !loading && !error && activityLog.length > 0 && (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Timestamp" }), _jsx(TableHead, { children: "Customer" }), _jsx(TableHead, { children: "Action" }), _jsx(TableHead, { children: "Booking ID" })] }) }), _jsx(TableBody, { children: activityLog.slice(0, 10).map((log) => ( // Displaying latest 10 entries for brevity
                                        _jsxs(TableRow, { children: [_jsx(TableCell, { children: log.displayTimestamp }), _jsx(TableCell, { children: log.customerName }), _jsx(TableCell, { children: log.action }), _jsx(TableCell, { children: log.bookingId })] }, log.id))) })] }))] })] })] }));
};
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
