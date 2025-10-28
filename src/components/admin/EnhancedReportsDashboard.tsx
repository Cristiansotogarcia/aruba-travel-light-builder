import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from '@/components/common/dynamic/DynamicChart';
import { subDays, format, parseISO, eachDayOfInterval, compareAsc, startOfMonth, subMonths, formatDistanceToNow } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Users, Eye, TrendingUp, ExternalLink } from 'lucide-react';
import { umamiService } from '@/lib/services/umamiService';

// Enhanced interfaces
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
  id: string;
  timestamp: string;
  displayTimestamp: string;
  customerName: string;
  action: string;
  bookingId: string;
}

interface UmamiGeoData {
  x: string;
  y: number;
}

interface UmamiDeviceData {
  x: string;
  y: number;
}

interface UmamiTopPage {
  x: string;
  y: number;
}

interface EnhancedAnalyticsData {
  business: {
    bookingTrends: BookingTrendData[];
    totalRevenue: number;
    revenueTrends: RevenueTrendData[];
    equipmentUtilization: EquipmentUtilizationData[];
    activityLog: ActivityLogEntry[];
  };
  web: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounceRate: number;
    avgSessionDuration: number;
    realTimeVisitors: number;
    countries: UmamiGeoData[];
    devices: UmamiDeviceData[];
    browsers: UmamiDeviceData[];
    referrers: UmamiGeoData[];
    topPages: UmamiTopPage[];
  };
}

export const EnhancedReportsDashboard: React.FC = () => {
  const [data, setData] = useState<EnhancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Filter states
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");

  // Fetch business analytics
  const fetchBusinessAnalytics = async (filters: { dateRange?: DateRange, productId?: string, customerName?: string }) => {
    try {
      let bookingsQuery = supabase
        .from('bookings')
        .select('id, start_date, end_date, status, total_amount, customer_name, created_at, updated_at, booking_items(equipment_name, quantity, equipment_id)')
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

      const { data: bookingsData, error: bookingsError } = await bookingsQuery;
      if (bookingsError) throw bookingsError;

      let filteredBookings = bookingsData || [];
      if (filters.productId) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.booking_items?.some(item => item.equipment_id === filters.productId)
        );
      }

      const { data: productsData, error: productsError } = await supabase
        .from('equipment')
        .select('*');
      if (productsError) throw productsError;

      return {
        bookingTrends: processBookingDataForTrends(filteredBookings),
        totalRevenue: filteredBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0),
        revenueTrends: processBookingDataForRevenue(filteredBookings),
        equipmentUtilization: processDataForEquipmentUtilization(filteredBookings, productsData || []),
        activityLog: processBookingsForActivityLog(filteredBookings),
      };
    } catch (error) {
      console.error('Error fetching business analytics:', error);
      throw error;
    }
  };

  // Fetch web analytics from Umami
  const fetchWebAnalytics = async (startDate?: Date, endDate?: Date) => {
    try {
      const [
        stats,
        countries,
        devices,
        browsers,
        referrers,
        topPages,
        realTime
      ] = await Promise.all([
        umamiService.getWebsiteStats(startDate, endDate),
        umamiService.getCountries(startDate, endDate, 10),
        umamiService.getDevices(startDate, endDate, 10),
        umamiService.getBrowsers(startDate, endDate, 10),
        umamiService.getReferrers(startDate, endDate, 10),
        umamiService.getTopPages(startDate, endDate, 10),
        umamiService.getRealTimeVisitors()
      ]);

      return {
        pageviews: stats.pageviews,
        visitors: stats.visitors,
        visits: stats.visits,
        bounceRate: stats.bounceRate,
        avgSessionDuration: stats.avgSessionDuration,
        realTimeVisitors: realTime,
        countries,
        devices,
        browsers,
        referrers,
        topPages
      };
    } catch (error) {
      console.error('Error fetching web analytics:', error);
      return {
        pageviews: 0,
        visitors: 0,
        visits: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        realTimeVisitors: 0,
        countries: [],
        devices: [],
        browsers: [],
        referrers: [],
        topPages: []
      };
    }
  };

  // Data processing functions
  const processBookingDataForTrends = (bookings: any[]): BookingTrendData[] => {
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
        console.error('Error parsing booking start_date:', booking.start_date, e);
      }
    });
    
    return Object.entries(bookingsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
  };

  const processBookingDataForRevenue = (bookings: any[]): RevenueTrendData[] => {
    if (!bookings || bookings.length === 0) return [];

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
        console.error('Error parsing booking start_date:', booking.start_date, e);
      }
    });

    return Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({
        month: format(parseISO(month + '-01'), 'MMM yyyy'),
        revenue,
      }))
      .sort((a, b) => compareAsc(parseISO(a.month), parseISO(b.month)));
  };

  const processDataForEquipmentUtilization = (bookings: any[], products: any[]): EquipmentUtilizationData[] => {
    if (!bookings || bookings.length === 0 || !products || products.length === 0) return [];

    const utilizationMap: { [productName: string]: number } = {};
    products.forEach(product => {
      utilizationMap[product.name] = 0;
    });

    bookings.forEach(booking => {
      booking.booking_items?.forEach((item: { equipment_name: string; quantity: number }) => {
        if (item.equipment_name && utilizationMap.hasOwnProperty(item.equipment_name)) {
          utilizationMap[item.equipment_name] += item.quantity || 0;
        }
      });
    });

    return Object.entries(utilizationMap)
      .map(([name, bookedQuantity]) => ({ name, bookedQuantity }))
      .sort((a, b) => b.bookedQuantity - a.bookedQuantity);
  };

  const processBookingsForActivityLog = (bookings: any[]): ActivityLogEntry[] => {
    if (!bookings || bookings.length === 0) return [];

    const logEntries: ActivityLogEntry[] = [];

    bookings.forEach(booking => {
      logEntries.push({
        id: `${booking.id}_created`,
        timestamp: booking.created_at,
        displayTimestamp: formatDistanceToNow(parseISO(booking.created_at), { addSuffix: true }),
        customerName: booking.customer_name || 'N/A',
        action: 'New Booking Created',
        bookingId: booking.id,
      });

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

    return logEntries.sort((a, b) => compareAsc(parseISO(b.timestamp), parseISO(a.timestamp)));
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [businessData, webData, productsData] = await Promise.all([
        fetchBusinessAnalytics({ dateRange: selectedDateRange, productId: selectedProductId, customerName: selectedCustomerName }),
        fetchWebAnalytics(selectedDateRange?.from, selectedDateRange?.to),
        supabase.from('equipment').select('*')
      ]);

      if (productsData.error) throw productsData.error;

      setData({
        business: businessData,
        web: webData
      });
      setAllProducts(productsData.data || []);
    } catch (err: any) {
      console.error("Error fetching enhanced analytics:", err);
      setError(err.message || 'Failed to fetch analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Subscribe to real-time booking changes
    const bookingsSubscription = supabase
      .channel('public:bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSubscription);
    };
  }, [selectedDateRange, selectedProductId, selectedCustomerName]);

  if (loading) return (
    <div className="p-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading enhanced analytics...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Enhanced Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive business and web analytics</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div>
            <Label htmlFor="date-range">Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant="outline"
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
                <SelectItem value={undefined as any}>All Products</SelectItem>
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
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="web">Web Analytics</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(data?.business.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.business.bookingTrends.reduce((sum, trend) => sum + trend.count, 0) || 0}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.web.pageviews.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Live Visitors</CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data?.web.realTimeVisitors || 0}</div>
                <p className="text-xs text-muted-foreground">Right now</p>
              </CardContent>
            </Card>
          </div>

          {/* Combined Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Trends</CardTitle>
                <CardDescription>Daily bookings over time</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.business.bookingTrends.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.business.bookingTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(tick) => format(parseISO(tick), 'MMM d')} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" name="Bookings" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p>No booking data available</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Web Traffic</CardTitle>
                <CardDescription>Web analytics overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Page Views:</span>
                    <span className="font-semibold">{data?.web.pageviews.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Visitors:</span>
                    <span className="font-semibold">{data?.web.visitors.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bounce Rate:</span>
                    <span className="font-semibold">{data?.web.bounceRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Total revenue: ${(
                data?.business.totalRevenue ?? 0
              ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.business.revenueTrends.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.business.revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                        `$${(value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        'Revenue',
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#82ca9d" name="Monthly Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p>No revenue data available</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Equipment Utilization</CardTitle>
              <CardDescription>Most booked equipment items</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.business.equipmentUtilization.length ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.business.equipmentUtilization} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} interval={0} />
                    <Tooltip formatter={(value: any) => [value || 0, 'Times Booked']} />
                    <Bar dataKey="bookedQuantity" fill="#8884d8" name="Total Quantity Booked" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p>No equipment utilization data available</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Activity Log</CardTitle>
              <CardDescription>Recent booking activities</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.business.activityLog.length ? (
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
                    {data.business.activityLog.slice(0, 10).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.displayTimestamp}</TableCell>
                        <TableCell>{log.customerName}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.bookingId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p>No customer activity to display</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="web" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most visited pages</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.web.topPages.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.web.topPages.slice(0, 5).map((page) => (
                        <TableRow key={page.x}>
                          <TableCell className="max-w-xs truncate">{page.x}</TableCell>
                          <TableCell>{page.y.toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => window.open(page.x, '_blank')}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p>No page view data available</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>Where visitors come from</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.web.referrers.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Visitors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.web.referrers.slice(0, 5).map((referrer) => (
                        <TableRow key={referrer.x}>
                          <TableCell className="max-w-xs truncate">{referrer.x}</TableCell>
                          <TableCell>{referrer.y.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p>No referrer data available</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
                <CardDescription>Visitor device breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.web.devices.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.web.devices}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="y" fill="#8884d8" name="Visitors" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p>No device data available</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browsers</CardTitle>
                <CardDescription>Most popular browsers</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.web.browsers.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.web.browsers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="y" fill="#82ca9d" name="Visitors" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p>No browser data available</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Countries</CardTitle>
                <CardDescription>Visitor distribution by country</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.web.countries.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead>Visitors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.web.countries.map((country) => (
                        <TableRow key={country.x}>
                          <TableCell>{country.x}</TableCell>
                          <TableCell>{country.y.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p>No geographic data available</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Web Analytics Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Page Views:</span>
                    <span className="font-semibold">{data?.web.pageviews.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Visitors:</span>
                    <span className="font-semibold">{data?.web.visitors.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Visits:</span>
                    <span className="font-semibold">{data?.web.visits.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bounce Rate:</span>
                    <span className="font-semibold">{data?.web.bounceRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg. Session Duration:</span>
                    <span className="font-semibold">{data?.web.avgSessionDuration.toFixed(1)} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
