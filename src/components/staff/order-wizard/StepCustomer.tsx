import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface CustomerFields {
  name: string;
  email: string;
  phone: string;
  comment: string;
}

interface StepCustomerProps {
  customer: CustomerFields;
  onChange: (field: keyof CustomerFields, value: string) => void;
}

export function StepCustomer({ customer, onChange }: StepCustomerProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Customer details</h3>
        <p className="text-sm text-muted-foreground">Who is this order for?</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-name">Full name</Label>
        <Input
          id="wizard-name"
          value={customer.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Customer name"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wizard-email">Email</Label>
          <Input
            id="wizard-email"
            type="email"
            value={customer.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="customer@email.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wizard-phone">Phone</Label>
          <Input
            id="wizard-phone"
            value={customer.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+297 …"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-comment">Notes (optional)</Label>
        <Textarea
          id="wizard-comment"
          value={customer.comment}
          onChange={(e) => onChange('comment', e.target.value)}
          placeholder="Anything the team should know about this order"
          rows={3}
        />
      </div>
    </div>
  );
}
