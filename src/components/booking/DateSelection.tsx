
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DateSelectionProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

interface DateValidationError {
  field: 'startDate' | 'endDate' | 'general';
  message: string;
}

export const DateSelection = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: DateSelectionProps) => {
  const [errors, setErrors] = useState<DateValidationError[]>([]);
  const [touched, setTouched] = useState({ startDate: false, endDate: false });

  // Validation constants
  const today = new Date().toISOString().split('T')[0];
  const maxAdvanceBookingDays = 365; // 1 year in advance
  const maxRentalDays = 30; // Maximum rental period
  const minRentalDays = 3; // Minimum rental period (3 days)

  // Calculate max booking date (1 year from today)
  const maxBookingDate = new Date();
  maxBookingDate.setDate(maxBookingDate.getDate() + maxAdvanceBookingDays);
  const maxBookingDateStr = maxBookingDate.toISOString().split('T')[0];

  const validateDates = () => {
    const newErrors: DateValidationError[] = [];
    
    if (!startDate && touched.startDate) {
      newErrors.push({ field: 'startDate', message: 'Start date is required' });
    }
    
    if (!endDate && touched.endDate) {
      newErrors.push({ field: 'endDate', message: 'End date is required' });
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const todayDate = new Date(today);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Check if start date is in the past
      if (start < todayDate) {
        newErrors.push({ field: 'startDate', message: 'Start date cannot be in the past' });
      }
      
      // Check if dates are too far in advance
      if (start > maxBookingDate) {
        newErrors.push({ field: 'startDate', message: `Bookings can only be made up to ${maxAdvanceBookingDays} days in advance` });
      }
      
      if (end > maxBookingDate) {
        newErrors.push({ field: 'endDate', message: `Bookings can only be made up to ${maxAdvanceBookingDays} days in advance` });
      }
      
      // Check if end date is before start date
      if (end <= start) {
        newErrors.push({ field: 'endDate', message: 'End date must be after start date' });
      }
      
      // Check rental period limits
      if (diffDays < minRentalDays) {
        newErrors.push({ field: 'general', message: `Minimum rental period is ${minRentalDays} days` });
      }
      
      if (diffDays > maxRentalDays) {
        newErrors.push({ field: 'general', message: `Maximum rental period is ${maxRentalDays} days` });
      }
    }
    
    setErrors(newErrors);
  };

  useEffect(() => {
    validateDates();
  }, [startDate, endDate, touched]);

  const handleStartDateChange = (date: string) => {
    setTouched(prev => ({ ...prev, startDate: true }));
    onStartDateChange(date);
    
    // Auto-adjust end date to maintain 3-day minimum if needed
    if (date && endDate) {
      const start = new Date(date);
      const end = new Date(endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < minRentalDays) {
        // Automatically set end date to 3 days after start
        const newEnd = new Date(start);
        newEnd.setDate(newEnd.getDate() + minRentalDays);
        onEndDateChange(newEnd.toISOString().split('T')[0]);
      }
    }
  };

  const handleEndDateChange = (date: string) => {
    setTouched(prev => ({ ...prev, endDate: true }));
    onEndDateChange(date);
  };

  const getFieldError = (field: 'startDate' | 'endDate') => {
    return errors.find(error => error.field === field)?.message;
  };

  const generalErrors = errors.filter(error => error.field === 'general');
  const hasErrors = errors.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Rental Period
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {generalErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {generalErrors.map((error, index) => (
                <div key={index}>{error.message}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className={getFieldError('startDate') ? 'text-destructive' : ''}>
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, startDate: true }))}
              min={today}
              max={maxBookingDateStr}
              required
              className={getFieldError('startDate') ? 'border-destructive focus:border-destructive' : ''}
            />
            {getFieldError('startDate') && (
              <p className="text-sm text-destructive mt-1">{getFieldError('startDate')}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="endDate" className={getFieldError('endDate') ? 'text-destructive' : ''}>
              End Date
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, endDate: true }))}
              min={startDate ? (() => {
                const minEnd = new Date(startDate);
                minEnd.setDate(minEnd.getDate() + minRentalDays);
                return minEnd.toISOString().split('T')[0];
              })() : today}
              max={maxBookingDateStr}
              required
              className={getFieldError('endDate') ? 'border-destructive focus:border-destructive' : ''}
            />
            {getFieldError('endDate') && (
              <p className="text-sm text-destructive mt-1">{getFieldError('endDate')}</p>
            )}
          </div>
        </div>
        
        {startDate && endDate && !hasErrors && (
          <div className="text-sm text-muted-foreground">
            Rental period: {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} day(s)
          </div>
        )}
      </CardContent>
    </Card>
  );
};
