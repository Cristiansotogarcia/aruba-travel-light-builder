import { useState } from 'react';
import { CalendarClock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CONTACT_EMAIL,
  isSelfServiceEligible,
  isSelfServiceableStatus,
} from '@/lib/customer/selfService';
import { CancelBookingDialog } from './CancelBookingDialog';
import { RescheduleBookingDialog } from './RescheduleBookingDialog';

interface ActionItem {
  equipment_id: string;
  equipment_name: string;
  quantity: number;
}

interface BookingSelfServiceActionsProps {
  bookingId: string;
  status: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  items: ActionItem[];
}

/**
 * Cancel / Change-dates controls for one booking card.
 *
 * The buttons only show when the booking status is still changeable AND the
 * start date is at least 7 days away (client-side date math for display; the
 * RPCs enforce the same rule in SQL). Inside the 7-day window we show the
 * policy text with the contact email instead.
 */
export function BookingSelfServiceActions({
  bookingId,
  status,
  startDate,
  endDate,
  items,
}: BookingSelfServiceActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  if (!isSelfServiceableStatus(status)) {
    return null;
  }

  if (!isSelfServiceEligible(startDate)) {
    return (
      <p className="text-xs text-muted-foreground">
        Changes and cancellations are available online up to 7 days before your rental starts.
        Need help with this booking? Email{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Booking%20%23${bookingId.substring(0, 8)}`}
          className="font-medium text-primary hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>
        <CalendarClock className="mr-1.5 h-4 w-4" />
        Change dates
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setCancelOpen(true)}
      >
        <XCircle className="mr-1.5 h-4 w-4" />
        Cancel
      </Button>

      <CancelBookingDialog bookingId={bookingId} open={cancelOpen} onOpenChange={setCancelOpen} />
      <RescheduleBookingDialog
        bookingId={bookingId}
        startDate={startDate}
        endDate={endDate}
        items={items}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
      />
    </div>
  );
}
