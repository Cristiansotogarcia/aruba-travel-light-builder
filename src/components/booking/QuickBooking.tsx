import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const QuickBooking = () => {
  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          Policy Notification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="text-xs sm:text-sm text-gray-700 leading-relaxed">
          <ul className="list-disc list-inside space-y-2">
            <li>Sunday deliveries are only available for orders that include a <strong>crib</strong> or <strong>pack and play</strong>.</li>
            <li>All orders are based on a minimal 3 day rental.</li>
            <li>Free Delivery For Weekly Rentals.</li>
          </ul>
        </div>

        <Link to="/contact" className="w-full block">
          <Button className="w-full" size="lg">
            Contact Us
          </Button>
        </Link>

        <div className="text-center pt-2">
          <p className="text-sm text-gray-500">
            Need help? Email us at{' '}
            <a href="mailto:info@travelightaruba.com" className="text-primary hover:underline">
              info@travelightaruba.com
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
