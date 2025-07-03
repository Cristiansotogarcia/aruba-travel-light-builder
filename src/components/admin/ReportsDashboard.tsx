import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Booking, BookingStatus, BookingItem } from '@/components/admin/calendar/types'; // Direct import for clarity
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  DynamicChartWrapper
} from '@/components/common/dynamic/DynamicChart';
import { subDays, format, parseISO, eachDayOfInterval, compareAsc, startOfMonth, subMonths, formatDistanceToNow } from 'date-fns'; // Added formatDistanceToNow
import { Product } from '@/types/types';
import { DateRange } from 'react-day-picker'; // Re-adding based on error, assuming it's needed.
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Shadcn Table components

interface BookingTrendData {
  date: string;
  count: number;
}

interface RevenueTrendData {
  month: string;
  revenue: number;
}

interface EquipmentUtilizationData {
  name: string;
  bookedQuantity: number;
}

interface ActivityLogEntry {
  id: string; // Unique ID for the log entry (e.g., bookingId_action)
  timestamp: string; // ISO string
  displayTimestamp: string; // User-friendly timestamp (e.g., "2 hours ago")
  customerName: string;
  action: string;
  bookingId: string;
}

export const ReportsDashboard: React.FC = () => {
  const [bookingTrends, setBookingTrends] = useState<BookingTrendData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrendData[]>([]);
  const [equipmentUtilization, setEquipmentUtilization] = useState<EquipmentUtilizationData[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(
    {
      from: subDays(new Date(), 29),
      to: new Date(),
    }
  );
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");

  const processBookingDataForTrends = (bookings: Booking[]): BookingTrendData[] => {
    if (!bookings || bookings.length === 0) return [];
    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const bookingsByDay: { [key: string]: number } = {};
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
      } catch (e) {
        console.error('Error parsing booking start_date for trends:', booking.start_date, e);
      }
    });
    return Object.entries(bookingsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
  };

  const processBookingDataForRevenue = (bookings: Booking[]) => {
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
    const monthlyRevenue: { [key: string]: number } = {};
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
      } catch (e) {
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

  const processDataForEquipmentUtilization = (bookings: Booking[], products: Product[]): EquipmentUtilizationData[] => {
    if (!bookings || bookings.length === 0 || !products || products.length === 0) return [];

    const utilizationMap: { [productName: string]: number } = {};

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

  const processBookingsForActivityLog = (bookings: Booking[]): ActivityLogEntry[] => {
    if (!bookings || bookings.length === 0) return [];

    const logEntries: ActivityLogEntry[] = [];

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

  const fetchBookingData = async (filters: { dateRange?: DateRange, productId?: string, customerName?: string }) => {
    setLoading(true);
    setError(null);
    try {
      let bookingsQuery = supabase
        .from('bookings')
        .select('id, start_date, end_date, status, total_amount, customer_name, customer_email, customer_phone, customer_address, assigned_to, delivery_failure_reason, created_at, updated_at, booking_items(equipment_name, quantity, equipment_id)') // Added end_date, customer_email, customer_phone, customer_address, assigned_to, delivery_failure_reason
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
      if (bookingsError) throw bookingsError;

      // Ensure bookingsData is not null and then map, casting status
      let mappedBookings = bookingsData ? bookingsData.map(b => ({
        ...b,
        status: b.status as BookingStatus, // Cast status to BookingStatus
        assigned_to: b.assigned_to || null, // Ensure assigned_to field exists
        // Ensure booking_items is always an array, even if null/undefined from DB
        booking_items: (b.booking_items || []).map((item: any) => ({
          equipment_name: item.equipment_name,
          quantity: item.quantity,
          equipment_id: item.equipment_id,
          equipment_price: item.equipment_price || 0, // Ensure equipment_price exists or provide default
          subtotal: item.subtotal || 0 // Ensure subtotal exists or provide default
        })) as BookingItem[], 
      })) : [];

      let filteredBookings = mappedBookings as Booking[];

      if (filters.productId) {
        filteredBookings = mappedBookings.filter(booking => 
          booking.booking_items?.some(item => item.equipment_id === filters.productId)
        );
      }

      const { data: productsData, error: productsError } = await supabase
        .from('equipment')
        .select('*'); // Select all columns including stock_quantity
      if (productsError) throw productsError;
      
      // Ensure productsData is an array before mapping and conforms to Product[] type
      const typedProductsData = (Array.isArray(productsData) ? productsData.map((p: any) => ({
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
      })) : []) as Product[];
      setAllProducts(typedProductsData); 

      setBookingTrends(processBookingDataForTrends(filteredBookings));
      processBookingDataForRevenue(filteredBookings);
      setEquipmentUtilization(processDataForEquipmentUtilization(filteredBookings, typedProductsData));
      setActivityLog(processBookingsForActivityLog(filteredBookings));

    } catch (err: any) {
      console.error("Error fetching report data:", err);
      setError(err.message || 'Failed to fetch report data.');
    } finally {
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('Change received for bookings!', payload);
          // Refetch data with current filters when a change occurs
          fetchBookingData({ 
            dateRange: selectedDateRange, 
            productId: selectedProductId, 
            customerName: selectedCustomerName 
          });
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(bookingsSubscription);
    };
  }, [selectedDateRange, selectedProductId, selectedCustomerName]); // Re-run effect if filters change

  if (loading) return <div className="p-4">Loading reports...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div>
            <Label htmlFor="date-range">Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant={"outline"}
                  className={`w-[300px] justify-start text-left font-normal ${!selectedDateRange && "text-muted-foreground"}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDateRange?.from ? (
                    selectedDateRange.to ? (
                      <>
                        {format(selectedDateRange.from, "LLL dd, y")} - {" "}
                        {format(selectedDateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(selectedDateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={selectedDateRange?.from}
                  selected={selectedDateRange}
                  onSelect={setSelectedDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="product-filter">Product</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="w-[200px]" id="product-filter">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={undefined as any}>All Products</SelectItem> {/* Ensure 'undefined' is passed to clear filter */}
                {allProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="customer-filter">Customer Name</Label>
            <Input 
              id="customer-filter"
              placeholder="Search customer..."
              value={selectedCustomerName}
              onChange={(e) => setSelectedCustomerName(e.target.value)}
              className="w-[200px]"
            />
          </div>
           <Button onClick={() => fetchBookingData({ dateRange: selectedDateRange, productId: selectedProductId, customerName: selectedCustomerName })}>
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Booking Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Trends Analysis (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading booking trends...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!loading && !error && bookingTrends.length === 0 && <p>No booking data available for trends.</p>}
          {!loading && !error && bookingTrends.length > 0 && (
            <div style={{ width: '100%', height: 300 }}>
              <DynamicChartWrapper>
                <ResponsiveContainer>
                  <LineChart data={bookingTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(tick) => format(parseISO(tick), 'MMM d')} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" name="Bookings" />
                  </LineChart>
                </ResponsiveContainer>
              </DynamicChartWrapper>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading revenue data...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!loading && !error && (
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-semibold">Total Revenue: ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
              {revenueTrends.length === 0 && <p>No revenue data available for trends.</p>}
              {revenueTrends.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-2">Monthly Revenue (Last 12 Months)</h4>
                  <div style={{ width: '100%', height: 300 }}>
                    <DynamicChartWrapper>
                      <ResponsiveContainer>
                        <BarChart data={revenueTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#82ca9d" name="Monthly Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </DynamicChartWrapper>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipment Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading equipment utilization data...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!loading && !error && equipmentUtilization.length === 0 && <p>No equipment utilization data available.</p>}
          {!loading && !error && equipmentUtilization.length > 0 && (
            <div style={{ width: '100%', height: 400 }}> {/* Increased height for better visibility if many items */}
              <DynamicChartWrapper>
                <ResponsiveContainer>
                  <BarChart data={equipmentUtilization} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} interval={0} />
                    <Tooltip formatter={(value: number) => [value, 'Times Booked']} />
                    <Legend />
                    <Bar dataKey="bookedQuantity" fill="#8884d8" name="Total Quantity Booked" />
                  </BarChart>
                </ResponsiveContainer>
              </DynamicChartWrapper>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder for other reports */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading activity log...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!loading && !error && activityLog.length === 0 && <p>No customer activity to display.</p>}
          {!loading && !error && activityLog.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Booking ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLog.slice(0, 10).map((log) => ( // Displaying latest 10 entries for brevity
                  <TableRow key={log.id}>
                    <TableCell>{log.displayTimestamp}</TableCell>
                    <TableCell>{log.customerName}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.bookingId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";