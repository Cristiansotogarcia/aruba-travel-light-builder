
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Phone, Mail, Trash2 } from 'lucide-react';
import { mockEquipment } from '@/data/mockEquipment';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BookingItem {
  equipmentId: string;
  quantity: number;
}

interface BookingFormData {
  startDate: string;
  endDate: string;
  items: BookingItem[];
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

export const BookingForm = () => {
  const [bookingData, setBookingData] = useState<BookingFormData>({
    startDate: '',
    endDate: '',
    items: [],
    customerInfo: {
      name: '',
      email: '',
      phone: '',
      address: ''
    }
  });

  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const addEquipment = () => {
    if (!selectedEquipment) return;
    
    const existingItem = bookingData.items.find(item => item.equipmentId === selectedEquipment);
    if (existingItem) {
      setBookingData(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.equipmentId === selectedEquipment
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }));
    } else {
      setBookingData(prev => ({
        ...prev,
        items: [...prev.items, { equipmentId: selectedEquipment, quantity }]
      }));
    }
    
    setSelectedEquipment('');
    setQuantity(1);
  };

  const removeEquipment = (equipmentId: string) => {
    setBookingData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.equipmentId !== equipmentId)
    }));
  };

  const updateCustomerInfo = (field: string, value: string) => {
    setBookingData(prev => ({
      ...prev,
      customerInfo: {
        ...prev.customerInfo,
        [field]: value
      }
    }));
  };

  const calculateTotal = () => {
    if (!bookingData.startDate || !bookingData.endDate) return 0;
    
    const start = new Date(bookingData.startDate);
    const end = new Date(bookingData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return bookingData.items.reduce((total, item) => {
      const equipment = mockEquipment.find(eq => eq.id === item.equipmentId);
      return total + (equipment ? equipment.price * item.quantity * days : 0);
    }, 0);
  };

  const getDays = () => {
    if (!bookingData.startDate || !bookingData.endDate) return 0;
    const start = new Date(bookingData.startDate);
    const end = new Date(bookingData.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotal();
      const days = getDays();

      // Create the booking record
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_name: bookingData.customerInfo.name,
          customer_email: bookingData.customerInfo.email,
          customer_phone: bookingData.customerInfo.phone,
          customer_address: bookingData.customerInfo.address,
          start_date: bookingData.startDate,
          end_date: bookingData.endDate,
          total_amount: totalAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        throw bookingError;
      }

      // Create booking items
      const bookingItems = bookingData.items.map(item => {
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
        .insert(bookingItems);

      if (itemsError) {
        console.error('Error creating booking items:', itemsError);
        throw itemsError;
      }

      toast({
        title: "Booking Submitted Successfully!",
        description: `Your booking request #${booking.id.substring(0, 8)} has been submitted. We will contact you shortly to confirm the details.`,
      });

      // Reset form
      setBookingData({
        startDate: '',
        endDate: '',
        items: [],
        customerInfo: {
          name: '',
          email: '',
          phone: '',
          address: ''
        }
      });

    } catch (error) {
      console.error('Error submitting booking:', error);
      toast({
        title: "Error Submitting Booking",
        description: "There was an error submitting your booking request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableEquipment = mockEquipment.filter(eq => eq.availability !== 'unavailable');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Rental Period
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={bookingData.startDate}
                onChange={(e) => setBookingData(prev => ({ ...prev, startDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={bookingData.endDate}
                onChange={(e) => setBookingData(prev => ({ ...prev, endDate: e.target.value }))}
                min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Equipment Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="equipment">Equipment</Label>
                <select
                  id="equipment"
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select equipment...</option>
                  {availableEquipment.map(equipment => (
                    <option key={equipment.id} value={equipment.id}>
                      {equipment.name} - ${equipment.price}/day
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                />
              </div>
            </div>
            <Button type="button" onClick={addEquipment} disabled={!selectedEquipment}>
              Add to Booking
            </Button>

            {/* Selected Equipment List */}
            {bookingData.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Selected Equipment:</h4>
                {bookingData.items.map(item => {
                  const equipment = mockEquipment.find(eq => eq.id === item.equipmentId);
                  return equipment ? (
                    <div key={item.equipmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <img 
                          src={equipment.image} 
                          alt={equipment.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <p className="font-medium">{equipment.name}</p>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} × ${equipment.price}/day
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEquipment(item.equipmentId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={bookingData.customerInfo.name}
                onChange={(e) => updateCustomerInfo('name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={bookingData.customerInfo.email}
                onChange={(e) => updateCustomerInfo('email', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={bookingData.customerInfo.phone}
                onChange={(e) => updateCustomerInfo('phone', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Hotel/Address in Aruba</Label>
              <Input
                id="address"
                value={bookingData.customerInfo.address}
                onChange={(e) => updateCustomerInfo('address', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Summary */}
        {bookingData.items.length > 0 && bookingData.startDate && bookingData.endDate && (
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Rental Period:</span>
                  <span>{getDays()} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Equipment Items:</span>
                  <span>{bookingData.items.length}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${calculateTotal()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={bookingData.items.length === 0 || !bookingData.startDate || !bookingData.endDate || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Booking Request'}
        </Button>
      </form>
    </div>
  );
};
