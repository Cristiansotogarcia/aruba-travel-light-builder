
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickBookingProps {
  equipmentId?: string;
}

export const QuickBooking = ({ equipmentId }: QuickBookingProps) => {
  const [selectedDates, setSelectedDates] = useState({
    startDate: '',
    endDate: ''
  });

  const today = new Date().toISOString().split('T')[0];

  const calculateDays = () => {
    if (!selectedDates.startDate || !selectedDates.endDate) return 0;
    const start = new Date(selectedDates.startDate);
    const end = new Date(selectedDates.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Quick Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={selectedDates.startDate}
              onChange={(e) => setSelectedDates(prev => ({ ...prev, startDate: e.target.value }))}
              min={today}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={selectedDates.endDate}
              onChange={(e) => setSelectedDates(prev => ({ ...prev, endDate: e.target.value }))}
              min={selectedDates.startDate || today}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {selectedDates.startDate && selectedDates.endDate && (
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{calculateDays()} days rental</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Badge variant="outline" className="w-full justify-center py-2">
            Free Delivery & Pickup
          </Badge>
          <Badge variant="outline" className="w-full justify-center py-2">
            24/7 Support
          </Badge>
        </div>

        <Link to="/book" className="w-full">
          <Button className="w-full" size="lg">
            Continue Booking
          </Button>
        </Link>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? Call us at{' '}
            <a href="tel:+297-123-4567" className="text-primary hover:underline">
              +297 123-4567
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
