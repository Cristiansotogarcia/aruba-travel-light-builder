
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from 'lucide-react';

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  comment: string;
}

interface CustomerInformationProps {
  customerInfo: CustomerInfo;
  onCustomerInfoChange: (field: keyof CustomerInfo, value: string) => void;
}

export const CustomerInformation = ({ 
  customerInfo, 
  onCustomerInfoChange 
}: CustomerInformationProps) => {
  return (
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
            value={customerInfo.name}
            onChange={(e) => onCustomerInfoChange('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={customerInfo.email}
            onChange={(e) => onCustomerInfoChange('email', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={customerInfo.phone}
            onChange={(e) => onCustomerInfoChange('phone', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="address">Hotel/Address in Aruba</Label>
          <Input
            id="address"
            value={customerInfo.address}
            onChange={(e) => onCustomerInfoChange('address', e.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="comment">Comments</Label>
          <Textarea
            id="comment"
            value={customerInfo.comment}
            onChange={(e) => onCustomerInfoChange('comment', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
