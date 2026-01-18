
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, AlertCircle } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  room_number: string;
  comment: string;
}

interface CustomerInformationProps {
  customerInfo: CustomerInfo;
  onCustomerInfoChange: (field: keyof CustomerInfo, value: string) => void;
}

interface ValidationError {
  field: keyof CustomerInfo;
  message: string;
}

interface FieldTouched {
  name: boolean;
  email: boolean;
  phone: boolean;
  address: boolean;
  room_number: boolean;
  comment: boolean;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+]?[1-9][\d\s()-]{7,15}$/;
const namePattern = /^[a-zA-Z\s]{2,50}$/;

const validateField = (field: keyof CustomerInfo, value: string): string | null => {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'Full name is required';
      if (value.trim().length < 2) return 'Name must be at least 2 characters';
      if (value.trim().length > 50) return 'Name must be less than 50 characters';
      if (!namePattern.test(value.trim())) return 'Name can only contain letters and spaces';
      return null;
      
    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!emailPattern.test(value.trim())) return 'Please enter a valid email address';
      return null;
      
    case 'phone':
      if (!value.trim()) return 'Phone number is required';
      if (!phonePattern.test(value.trim())) return 'Please enter a valid phone number';
      return null;
      
    case 'address':
      if (!value.trim()) return 'Accommodation name is required';
      if (value.trim().length < 2) return 'Accommodation name must be at least 2 characters';
      if (value.trim().length > 200) return 'Accommodation name must be less than 200 characters';
      return null;
      
    case 'room_number':
      if (value.trim() && value.trim().length > 50) return 'Room number must be less than 50 characters';
      return null;
      
    case 'comment':
      if (value.length > 500) return 'Comments must be less than 500 characters';
      return null;
      
    default:
      return null;
  }
};

export const CustomerInformation = ({ 
  customerInfo, 
  onCustomerInfoChange 
}: CustomerInformationProps): React.ReactElement => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<FieldTouched>({
    name: false,
    email: false,
    phone: false,
    address: false,
    room_number: false,
    comment: false
  });

  const validateAllFields = useCallback(() => {
    const newErrors: ValidationError[] = [];
    
    Object.keys(customerInfo).forEach((key) => {
      const field = key as keyof CustomerInfo;
      if (touched[field]) {
        const error = validateField(field, customerInfo[field]);
        if (error) {
          newErrors.push({ field, message: error });
        }
      }
    });
    
    setErrors(newErrors);
  }, [customerInfo, touched]);

  useEffect(() => {
    validateAllFields();
  }, [validateAllFields]);

  const handleFieldChange = (field: keyof CustomerInfo, value: string) => {
    onCustomerInfoChange(field, value);
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleFieldBlur = (field: keyof CustomerInfo) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: keyof CustomerInfo) => {
    return errors.find(error => error.field === field)?.message;
  };

  const hasErrors = errors.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please correct the following errors:
              <ul className="list-disc list-inside mt-2">
                {errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className={getFieldError('name') ? 'text-destructive' : ''}>
              Full Name *
            </Label>
            <Input
              id="name"
              value={customerInfo.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              placeholder="Enter your full name"
              required
              className={getFieldError('name') ? 'border-destructive focus:border-destructive' : ''}
            />
            {getFieldError('name') && (
              <p className="text-sm text-destructive mt-1">{getFieldError('name')}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="email" className={getFieldError('email') ? 'text-destructive' : ''}>
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              onBlur={() => handleFieldBlur('email')}
              placeholder="your.email@example.com"
              required
              className={getFieldError('email') ? 'border-destructive focus:border-destructive' : ''}
            />
            {getFieldError('email') && (
              <p className="text-sm text-destructive mt-1">{getFieldError('email')}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="phone" className={getFieldError('phone') ? 'text-destructive' : ''}>
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={customerInfo.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              onBlur={() => handleFieldBlur('phone')}
              placeholder="+1 (555) 123-4567"
              required
              className={getFieldError('phone') ? 'border-destructive focus:border-destructive' : ''}
            />
            {getFieldError('phone') && (
              <p className="text-sm text-destructive mt-1">{getFieldError('phone')}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="address" className={getFieldError('address') ? 'text-destructive' : ''}>
              Accommodation Name *
            </Label>
            <Input
              id="address"
              value={customerInfo.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              onBlur={() => handleFieldBlur('address')}
              placeholder="Hotel or accommodation name"
              required
              className={getFieldError('address') ? 'border-destructive focus:border-destructive' : ''}
            />
            {getFieldError('address') && (
              <p className="text-sm text-destructive mt-1">{getFieldError('address')}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="room_number" className={getFieldError('room_number') ? 'text-destructive' : ''}>
              Room Number
            </Label>
            <Input
              id="room_number"
              value={customerInfo.room_number}
              onChange={(e) => handleFieldChange('room_number', e.target.value)}
              onBlur={() => handleFieldBlur('room_number')}
              placeholder="e.g., 305, Bungalow 12"
              className={getFieldError('room_number') ? 'border-destructive focus:border-destructive' : ''}
            />
            {getFieldError('room_number') && (
              <p className="text-sm text-destructive mt-1">{getFieldError('room_number')}</p>
            )}
          </div>
        </div>
        
        <div>
          <Label htmlFor="comment" className={getFieldError('comment') ? 'text-destructive' : ''}>
            Special Requests or Comments
          </Label>
          <Textarea
            id="comment"
            value={customerInfo.comment}
            onChange={(e) => handleFieldChange('comment', e.target.value)}
            onBlur={() => handleFieldBlur('comment')}
            placeholder="Any special requests or additional information..."
            rows={3}
            className={getFieldError('comment') ? 'border-destructive focus:border-destructive' : ''}
          />
          {getFieldError('comment') && (
            <p className="text-sm text-destructive mt-1">{getFieldError('comment')}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {customerInfo.comment.length}/500 characters
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
