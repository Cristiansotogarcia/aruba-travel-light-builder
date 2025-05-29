
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';

interface Customer {
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  bookings: any[];
  total_spent: number;
  last_booking: string;
}

interface EditCustomerModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCustomerUpdated: () => void;
}

export const EditCustomerModal = ({ open, onClose, customer, onCustomerUpdated }: EditCustomerModalProps) => {
  const [customerData, setCustomerData] = useState({
    name: customer?.customer_name || '',
    email: customer?.customer_email || '',
    phone: customer?.customer_phone || '',
    address: customer?.customer_address || ''
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Update local state when customer prop changes
  useState(() => {
    if (customer) {
      setCustomerData({
        name: customer.customer_name,
        email: customer.customer_email,
        phone: customer.customer_phone,
        address: customer.customer_address
      });
    }
  });

  const handleSave = async () => {
    if (!customer) return;

    if (!customerData.name.trim() || !customerData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and email are required fields.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      // Update all bookings for this customer with the new information
      const { error } = await supabase
        .from('bookings')
        .update({
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_phone: customerData.phone,
          customer_address: customerData.address,
          updated_at: new Date().toISOString()
        })
        .eq('customer_email', customer.customer_email);

      if (error) {
        console.error('Error updating customer:', error);
        throw error;
      }

      toast({
        title: "Customer Updated",
        description: `${customerData.name}'s information has been updated successfully.`,
      });

      onCustomerUpdated();
      handleClose();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "Failed to update customer information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCustomerData({
      name: '',
      email: '',
      phone: '',
      address: ''
    });
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Customer: {customer?.customer_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="customer-name">Name *</Label>
            <Input
              id="customer-name"
              value={customerData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Customer name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="customer-email">Email *</Label>
            <Input
              id="customer-email"
              type="email"
              value={customerData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="customer@email.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="customer-phone">Phone</Label>
            <Input
              id="customer-phone"
              value={customerData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Phone number"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="customer-address">Address</Label>
            <Input
              id="customer-address"
              value={customerData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Customer address"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saving || !customerData.name.trim() || !customerData.email.trim()}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
