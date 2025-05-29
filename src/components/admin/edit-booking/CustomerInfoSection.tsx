
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CustomerInfo } from './types';

interface CustomerInfoSectionProps {
  customerInfo: CustomerInfo;
  onCustomerInfoChange: (info: CustomerInfo) => void;
}

export const CustomerInfoSection = ({ customerInfo, onCustomerInfoChange }: CustomerInfoSectionProps) => {
  const updateCustomerInfo = (field: keyof CustomerInfo, value: string) => {
    onCustomerInfoChange({
      ...customerInfo,
      [field]: value
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Customer Information</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="name" className="text-xs">Name</Label>
          <Input
            id="name"
            value={customerInfo.name}
            onChange={(e) => updateCustomerInfo('name', e.target.value)}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-xs">Email</Label>
          <Input
            id="email"
            type="email"
            value={customerInfo.email}
            onChange={(e) => updateCustomerInfo('email', e.target.value)}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="phone" className="text-xs">Phone</Label>
          <Input
            id="phone"
            value={customerInfo.phone}
            onChange={(e) => updateCustomerInfo('phone', e.target.value)}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="address" className="text-xs">Address</Label>
          <Input
            id="address"
            value={customerInfo.address}
            onChange={(e) => updateCustomerInfo('address', e.target.value)}
            className="h-8"
          />
        </div>
      </div>
    </div>
  );
};
