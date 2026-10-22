
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, AlertCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { daysBetween, parseDateOnly, toDateOnly, todayDateOnly } from '@/lib/dateOnly';

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
  const [touched, setTouched] = useState({ startDate: false, endDate: false });

  // Validation constants
  const today = todayDateOnly();
  const maxAdvanceBookingDays = 365; // 1 year in advance
  const maxRentalDays = 30; // Maximum rental period
  const minRentalDays = 3; // Minimum rental period (3 days)

  // Calculate max booking date (1 year from today)
  const maxBookingDate = new Date();
  maxBookingDate.setDate(maxBookingDate.getDate() + maxAdvanceBookingDays);
  const maxBookingDateStr = toDateOnly(maxBookingDate);
  const maxBookingDateTime = maxBookingDate.getTime();

  const errors = useMemo(() => {
    const newErrors: DateValidationError[] = [];
    
    if (!startDate && touched.startDate) {
      newErrors.push({ field: 'startDate', message: 'Start date is required' });
    }
    
    if (!endDate && touched.endDate) {
      newErrors.push({ field: 'endDate', message: 'End date is required' });
    }
    
    if (startDate && endDate) {
      const start = parseDateOnly(startDate);
      const end = parseDateOnly(endDate);
      const todayDate = parseDateOnly(today);
      const diffDays = daysBetween(startDate, endDate);
      const maxDate = new Date(maxBookingDateTime);
      
      // Check if start date is in the past
      if (start < todayDate) {
        newErrors.push({ field: 'startDate', message: 'Start date cannot be in the past' });
      }
      
      // Check if dates are too far in advance
      if (start > maxDate) {
        newErrors.push({ field: 'startDate', message: `Bookings can only be made up to ${maxAdvanceBookingDays} days in advance` });
      }
      
      if (end > maxDate) {
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

    return newErrors;
  }, [endDate, maxAdvanceBookingDays, maxBookingDateTime, maxRentalDays, minRentalDays, startDate, today, touched]);

  const handleStartDateChange = (date: string) => {
    setTouched(prev => ({ ...prev, startDate: true }));
    onStartDateChange(date);
    
    // Auto-adjust end date to maintain 3-day minimum if needed
    if (date && endDate) {
      const start = parseDateOnly(date);
      const diffDays = daysBetween(date, endDate);
      
      if (diffDays < minRentalDays) {
        // Automatically set end date to 3 days after start
        const newEnd = new Date(start);
        newEnd.setDate(newEnd.getDate() + minRentalDays);
        onEndDateChange(toDateOnly(newEnd));
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
                const minEnd = parseDateOnly(startDate);
                minEnd.setDate(minEnd.getDate() + minRentalDays);
                return toDateOnly(minEnd);
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
            Rental period: {daysBetween(startDate, endDate)} day(s)
          </div>
        )}
      </CardContent>
    </Card>
  );
};
