
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Minus, X, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mockEquipment } from '@/data/mockEquipment';

interface BookingItem {
  equipment_name: string;
  quantity: number;
  subtotal: number;
  equipment_id: string;
  equipment_price: number;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  booking_items?: BookingItem[];
}

interface EditBookingModalProps {
  booking: Booking;
  onBookingUpdated: () => void;
  onClose: () => void;
  open: boolean;
}

export const EditBookingModal = ({ booking, onBookingUpdated, onClose, open }: EditBookingModalProps) => {
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
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (booking && open) {
      setStartDate(new Date(booking.start_date));
      setEndDate(new Date(booking.end_date));
      setCustomerInfo({
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
        address: booking.customer_address
      });
      setBookingItems(booking.booking_items || []);
      setDiscount(0);
    }
  }, [booking, open]);

  const addEquipment = () => {
    if (!selectedEquipment) return;
    
    const equipment = mockEquipment.find(eq => eq.id === selectedEquipment);
    if (!equipment) return;

    const existingItem = bookingItems.find(item => item.equipment_id === selectedEquipment);
    if (existingItem) {
      setBookingItems(items =>
        items.map(item =>
          item.equipment_id === selectedEquipment
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.equipment_price * calculateDays() }
            : item
        )
      );
    } else {
      const days = calculateDays();
      setBookingItems(items => [...items, {
        equipment_id: selectedEquipment,
        equipment_name: equipment.name,
        equipment_price: equipment.price,
        quantity: 1,
        subtotal: equipment.price * days
      }]);
    }
    setSelectedEquipment('');
  };

  const updateQuantity = (equipmentId: string, change: number) => {
    const days = calculateDays();
    setBookingItems(items =>
      items.map(item =>
        item.equipment_id === equipmentId
          ? { 
              ...item, 
              quantity: Math.max(1, item.quantity + change),
              subtotal: Math.max(1, item.quantity + change) * item.equipment_price * days
            }
          : item
      )
    );
  };

  const removeItem = (equipmentId: string) => {
    setBookingItems(items => items.filter(item => item.equipment_id !== equipmentId));
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
  };

  const calculateSubtotal = () => {
    return bookingItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - discount;
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

      // Update the booking record
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_address: customerInfo.address,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Delete existing booking items
      const { error: deleteError } = await supabase
        .from('booking_items')
        .delete()
        .eq('booking_id', booking.id);

      if (deleteError) throw deleteError;

      // Create new booking items
      const bookingItemsData = bookingItems.map(item => ({
        booking_id: booking.id,
        equipment_id: item.equipment_id,
        equipment_name: item.equipment_name,
        equipment_price: item.equipment_price,
        quantity: item.quantity,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Booking Updated Successfully!",
        description: `Booking #${booking.id.substring(0, 8)} has been updated.`,
      });

      onBookingUpdated();
      onClose();

    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error Updating Booking",
        description: "There was an error updating the booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking #{booking.id.substring(0, 8)}</DialogTitle>
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
                {bookingItems.map((item) => (
                  <Card key={item.equipment_id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{item.equipment_name}</span>
                          <Badge variant="outline" className="ml-2">
                            ${item.equipment_price}/day
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.equipment_id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="mx-2 font-medium">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.equipment_id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeItem(item.equipment_id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label htmlFor="discount">Discount ($)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              max={calculateSubtotal()}
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Math.min(calculateSubtotal(), Number(e.target.value))))}
              placeholder="Enter discount amount"
            />
          </div>

          {/* Total */}
          {startDate && endDate && bookingItems.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Discount:</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Total Amount:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Updating...' : 'Update Booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
