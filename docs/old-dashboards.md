## Old Driver Dashboard


import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, MapPin, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const DriverToday = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['driver-deliveries-today', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          delivery_address,
          scheduled_date,
          delivery_type,
          status,
          notes,
          reservations!inner (
            id,
            users!inner (
              full_name,
              email
            )
          )
        `)
        .eq('driver_id', user.id)
        .eq('scheduled_date', today)
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await supabase
        .from('deliveries')
        .update({ status: 'completed' })
        .eq('id', deliveryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries-today'] });
      toast({
        title: 'Delivery completed',
        description: 'The delivery status has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating delivery',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getDeliveryTypeColor = (type: string) => {
    return type === 'dropoff' ? 'bg-green-500' : 'bg-blue-500';
  };

  const getStatusColor = (status: string) => {
    return status === 'completed' ? 'bg-gray-500' : 'bg-yellow-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Today's Deliveries</h1>
        
        {deliveries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-600">
              No deliveries scheduled for today.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery: any) => (
              <Card key={delivery.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">
                          {delivery.reservations?.users?.full_name || delivery.reservations?.users?.email || 'Unknown Customer'}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Badge className={getDeliveryTypeColor(delivery.delivery_type)}>
                            {delivery.delivery_type === 'dropoff' ? 'Drop-off' : 'Pick-up'}
                          </Badge>
                          <Badge className={getStatusColor(delivery.status)}>
                            {delivery.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {delivery.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => toggleStatusMutation.mutate(delivery.id)}
                          disabled={toggleStatusMutation.isPending}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark Done
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{delivery.delivery_address}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <p className="text-sm text-gray-600">{delivery.scheduled_date}</p>
                      </div>
                    </div>
                    
                    {delivery.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Notes:</p>
                        <p className="text-sm text-gray-600">{delivery.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverToday;


## Old Booker Dashboard


import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, MapPin, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const DriverToday = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['driver-deliveries-today', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          delivery_address,
          scheduled_date,
          delivery_type,
          status,
          notes,
          reservations!inner (
            id,
            users!inner (
              full_name,
              email
            )
          )
        `)
        .eq('driver_id', user.id)
        .eq('scheduled_date', today)
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await supabase
        .from('deliveries')
        .update({ status: 'completed' })
        .eq('id', deliveryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries-today'] });
      toast({
        title: 'Delivery completed',
        description: 'The delivery status has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating delivery',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getDeliveryTypeColor = (type: string) => {
    return type === 'dropoff' ? 'bg-green-500' : 'bg-blue-500';
  };

  const getStatusColor = (status: string) => {
    return status === 'completed' ? 'bg-gray-500' : 'bg-yellow-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Today's Deliveries</h1>
        
        {deliveries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-600">
              No deliveries scheduled for today.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery: any) => (
              <Card key={delivery.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">
                          {delivery.reservations?.users?.full_name || delivery.reservations?.users?.email || 'Unknown Customer'}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Badge className={getDeliveryTypeColor(delivery.delivery_type)}>
                            {delivery.delivery_type === 'dropoff' ? 'Drop-off' : 'Pick-up'}
                          </Badge>
                          <Badge className={getStatusColor(delivery.status)}>
                            {delivery.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {delivery.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => toggleStatusMutation.mutate(delivery.id)}
                          disabled={toggleStatusMutation.isPending}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark Done
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{delivery.delivery_address}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <p className="text-sm text-gray-600">{delivery.scheduled_date}</p>
                      </div>
                    </div>
                    
                    {delivery.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Notes:</p>
                        <p className="text-sm text-gray-600">{delivery.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverToday;

## Old Admin Dashboard


import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Package, TrendingUp, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';

const AdminDashboard = () => {
  const { data: goingOutToday = [] } = useQuery({
    queryKey: ['deliveries-going-out-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          delivery_address,
          scheduled_date,
          reservations!inner (
            id,
            users!inner (
              full_name,
              email
            )
          )
        `)
        .eq('delivery_type', 'dropoff')
        .eq('scheduled_date', today)
        .eq('status', 'scheduled');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: comingBackToday = [] } = useQuery({
    queryKey: ['deliveries-coming-back-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          delivery_address,
          scheduled_date,
          reservations!inner (
            id,
            users!inner (
              full_name,
              email
            )
          )
        `)
        .eq('delivery_type', 'pickup')
        .eq('scheduled_date', today)
        .eq('status', 'scheduled');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [reservationsResult, productsResult, usersResult] = await Promise.all([
        supabase.from('reservations').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('users').select('id', { count: 'exact' }),
      ]);

      return {
        totalReservations: reservationsResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalUsers: usersResult.count || 0,
      };
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalReservations || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deliveries Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goingOutToday.length + comingBackToday.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Deliveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Going Out Today</CardTitle>
              <CardDescription>{goingOutToday.length} deliveries scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {goingOutToday.length === 0 ? (
                  <p className="text-gray-600">No deliveries going out today</p>
                ) : (
                  goingOutToday.map((delivery: any) => (
                    <div key={delivery.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {delivery.reservations?.users?.full_name || delivery.reservations?.users?.email || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-gray-600">{delivery.delivery_address}</p>
                      </div>
                      <span className="text-sm text-green-600 font-medium">Dropoff</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coming Back Today</CardTitle>
              <CardDescription>{comingBackToday.length} pickups scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comingBackToday.length === 0 ? (
                  <p className="text-gray-600">No pickups scheduled for today</p>
                ) : (
                  comingBackToday.map((delivery: any) => (
                    <div key={delivery.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {delivery.reservations?.users?.full_name || delivery.reservations?.users?.email || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-gray-600">{delivery.delivery_address}</p>
                      </div>
                      <span className="text-sm text-blue-600 font-medium">Pickup</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

## Old Invoices Page


import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import { format } from 'date-fns';

const InvoicesPage = () => {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          amount,
          status,
          due_date,
          paid_at,
          created_at,
          reservations!inner (
            id,
            users!inner (
              full_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Invoices</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Invoice List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.map((invoice: any) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{invoice.invoice_number}</h3>
                    <p className="text-sm text-gray-600">
                      {invoice.reservations?.users?.full_name || invoice.reservations?.users?.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      Created: {format(new Date(invoice.created_at), 'PPP')}
                    </p>
                    {invoice.due_date && (
                      <p className="text-sm text-gray-600">
                        Due: {format(new Date(invoice.due_date), 'PPP')}
                      </p>
                    )}
                    {invoice.paid_at && (
                      <p className="text-sm text-gray-600">
                        Paid: {format(new Date(invoice.paid_at), 'PPP')}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-lg">${invoice.amount}</p>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {invoices.length === 0 && (
                <div className="text-center py-8 text-gray-600">
                  No invoices found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvoicesPage;

## Old Inventory Page


import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_per_day: number;
  quantity_available: number;
  image_url: string | null;
  is_active: boolean;
}

const InventoryPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price_per_day: '',
    quantity_available: '',
    image_url: '',
    is_active: true,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const { error } = await supabase.from('products').insert(productData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'Product created successfully' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error creating product', description: error.message, variant: 'destructive' });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...productData }: any) => {
      const { error } = await supabase.from('products').update(productData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'Product updated successfully' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error updating product', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'Product deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting product', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      price_per_day: '',
      quantity_available: '',
      image_url: '',
      is_active: true,
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      price_per_day: product.price_per_day.toString(),
      quantity_available: product.quantity_available.toString(),
      image_url: product.image_url || '',
      is_active: product.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      ...formData,
      price_per_day: parseFloat(formData.price_per_day),
      quantity_available: parseInt(formData.quantity_available),
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, ...productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="price_per_day">Price per Day</Label>
                  <Input
                    id="price_per_day"
                    type="number"
                    step="0.01"
                    value={formData.price_per_day}
                    onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="quantity_available">Quantity Available</Label>
                  <Input
                    id="quantity_available"
                    type="number"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-gray-600">{product.category}</p>
                      <p className="text-sm">${product.price_per_day}/day • {product.quantity_available} available</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteProductMutation.mutate(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryPage;

## Old Reservations Page


import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import { format } from 'date-fns';

const ReservationsPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['admin-reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          start_date,
          end_date,
          total_amount,
          status,
          delivery_address,
          notes,
          created_at,
          users!inner (
            full_name,
            email
          ),
          reservation_items (
            quantity,
            price_per_day,
            total_price,
            products (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const filteredReservations = reservations.filter((reservation: any) => {
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      reservation.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'active':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Reservations</h1>
        
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by customer name, email, or reservation ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reservations List */}
        <div className="space-y-4">
          {filteredReservations.map((reservation: any) => (
            <Card key={reservation.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {reservation.users?.full_name || reservation.users?.email}
                    </h3>
                    <p className="text-sm text-gray-600">ID: {reservation.id}</p>
                    <p className="text-sm text-gray-600">
                      Created: {format(new Date(reservation.created_at), 'PPp')}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                    <Badge className={getStatusColor(reservation.status)}>
                      {reservation.status}
                    </Badge>
                    <span className="font-semibold text-lg">
                      ${reservation.total_amount}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">Rental Period</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(reservation.start_date), 'PPP')} - {format(new Date(reservation.end_date), 'PPP')}
                    </p>
                  </div>
                  
                  {reservation.delivery_address && (
                    <div>
                      <p className="text-sm font-medium">Delivery Address</p>
                      <p className="text-sm text-gray-600">{reservation.delivery_address}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Items</p>
                  <div className="space-y-1">
                    {reservation.reservation_items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.products?.name} (x{item.quantity})</span>
                        <span>${item.total_price}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {reservation.notes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">Notes</p>
                    <p className="text-sm text-gray-600">{reservation.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {filteredReservations.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-gray-600">
                No reservations found matching your criteria.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;

## Old Dashboard


import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import AdminTabs from '@/components/dashboard/AdminTabs';
import DriverDashboardContent from '@/components/dashboard/DriverDashboardContent';
import PublicDashboardContent from '@/components/dashboard/PublicDashboardContent';
import { useDashboardData } from '@/hooks/useDashboardData';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, userRole } = useAuth();
  const { products, deliveries } = useDashboardData(userRole);

  const handleStatusToggle = async (deliveryId: string) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ status: 'completed' })
        .eq('id', deliveryId);
      
      if (error) throw error;
      
      // Refetch deliveries to update the UI
      // This will be handled automatically by React Query
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  };

  const isAdmin = userRole === 'admin';
  const isDriver = userRole === 'driver';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.email} ({userRole})
          </p>
        </div>

        {isAdmin && <AdminTabs products={products} />}

        {isDriver && (
          <DriverDashboardContent 
            deliveries={deliveries}
            onStatusToggle={handleStatusToggle}
          />
        )}

        {userRole === 'public' && (
          <PublicDashboardContent products={products} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;

