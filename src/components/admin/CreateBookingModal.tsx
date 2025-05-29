import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Minus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mockEquipment } from '@/data/mockEquipment';

interface CreateBookingModalProps {
  onBookingCreated: () => void;
  preselectedDate?: Date;
}

interface BookingItem {
  equipmentId: string;
  quantity: number;
}

export const CreateBookingModal = ({ onBookingCreated, preselectedDate }: CreateBookingModalProps) => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (preselectedDate && open) {
      setStartDate(preselectedDate);
    }
  }, [preselectedDate, open]);

  const addEquipment = () => {
    if (!selectedEquipment) return;
    
    const existingItem = bookingItems.find(item => item.equipmentId === selectedEquipment);
    if (existingItem) {
      setBookingItems(items =>
        items.map(item =>
          item.equipmentId === selectedEquipment
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setBookingItems(items => [...items, { equipmentId: selectedEquipment, quantity: 1 }]);
    }
    setSelectedEquipment('');
  };

  const updateQuantity = (equipmentId: string, change: number) => {
    setBookingItems(items =>
      items.map(item =>
        item.equipmentId === equipmentId
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    );
  };

  const removeItem = (equipmentId: string) => {
    setBookingItems(items => items.filter(item => item.equipmentId !== equipmentId));
  };

  const calculateTotal = () => {
    if (!startDate || !endDate) return 0;
    
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return bookingItems.reduce((total, item) => {
      const equipment = mockEquipment.find(eq => eq.id === item.equipmentId);
      return total + (equipment ? equipment.price * item.quantity * days : 0);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || bookingItems.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and add at least one equipment item.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const totalAmount = calculateTotal();
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Create the booking record
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_address: customerInfo.address,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          total_amount: totalAmount,
          status: 'confirmed'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking items
      const bookingItemsData = bookingItems.map(item => {
        const equipment = mockEquipment.find(eq => eq.id === item.equipmentId);
        const subtotal = equipment ? equipment.price * item.quantity * days : 0;
        
        return {
          booking_id: booking.id,
          equipment_id: item.equipmentId,
          equipment_name: equipment?.name || '',
          equipment_price: equipment?.price || 0,
          quantity: item.quantity,
          subtotal: subtotal
        };
      });

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Booking Created Successfully!",
        description: `Booking #${booking.id.substring(0, 8)} has been created.`,
      });

      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setCustomerInfo({ name: '', email: '', phone: '', address: '' });
      setBookingItems([]);
      setOpen(false);
      onBookingCreated();

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error Creating Booking",
        description: "There was an error creating the booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="customer@email.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Customer address"
                />
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Rental Period</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Equipment Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Equipment</h3>
            <div className="flex gap-2">
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {mockEquipment.map((equipment) => (
                    <SelectItem key={equipment.id} value={equipment.id}>
                      {equipment.name} - ${equipment.price}/day
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addEquipment} disabled={!selectedEquipment}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Equipment Items */}
            {bookingItems.length > 0 && (
              <div className="space-y-2">
                {bookingItems.map((item) => {
                  const equipment = mockEquipment.find(eq => eq.id === item.equipmentId);
                  return (
                    <Card key={item.equipmentId}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{equipment?.name}</span>
                            <Badge variant="outline" className="ml-2">
                              ${equipment?.price}/day
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.equipmentId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="mx-2 font-medium">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.equipmentId, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeItem(item.equipmentId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total */}
          {startDate && endDate && bookingItems.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
