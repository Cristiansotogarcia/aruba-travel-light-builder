
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Mail, Phone, MapPin, Calendar, Search, Edit, Eye } from 'lucide-react';
import { EditCustomerModal } from './customer-management/EditCustomerModal';

interface Customer {
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  bookings: any[];
  total_spent: number;
  last_booking: string;
}

export const CustomersList = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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

      if (error) throw error;

      // Group bookings by customer email
      const customerMap = new Map<string, Customer>();

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

        const customer = customerMap.get(email)!;
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
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_phone.includes(searchTerm)
    );

    setFilteredCustomers(filtered);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditModalOpen(true);
  };

  const handleViewBookings = (customer: Customer) => {
    // Navigate to bookings with customer filter - for now just show toast
    toast({
      title: "View Bookings",
      description: `Viewing bookings for ${customer.customer_name}`,
    });
  };

  const handleCustomerUpdated = () => {
    fetchCustomers(); // Refresh the customers list
  };

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">View and manage your customer relationships</p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {filteredCustomers.length} customers
        </Badge>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Bookings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.length > 0 ? (customers.reduce((sum, c) => sum + c.bookings.length, 0) / customers.length).toFixed(1) : '0'}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Spend</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${customers.length > 0 ? (customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length).toFixed(0) : '0'}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Grid */}
      {filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.customer_email} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-gray-500">
                    #{customer.customer_email.substring(0, 8)}...
                  </div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {customer.customer_name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {customer.customer_email}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {customer.customer_phone}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">
                    Recent Booking: {new Date(customer.last_booking).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Total: ${customer.total_spent} • {customer.bookings.length} bookings
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewBookings(customer);
                    }}
                    className="h-7 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Bookings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCustomer(customer);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-500">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Customer data will appear here as bookings are made.'}
            </p>
          </CardContent>
        </Card>
      )}

      <EditCustomerModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        customer={selectedCustomer}
        onCustomerUpdated={handleCustomerUpdated}
      />
    </div>
  );
};
