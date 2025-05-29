
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { Booking } from './calendar/types';

interface UndeliverableModalProps {
  open: boolean;
  onClose: () => void;
  booking: Booking;
  onMarkUndeliverable: (bookingId: string, reason: string) => void;
}

const FAILURE_REASONS = [
  'missed flight',
  'no answer at door',
  'order was cancelled',
  'wrong delivery date'
];

export const UndeliverableModal = ({ 
  open, 
  onClose, 
  booking, 
  onMarkUndeliverable 
}: UndeliverableModalProps) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const reason = selectedReason === 'other' ? customReason : selectedReason;
    
    if (!reason.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onMarkUndeliverable(booking.id, reason);
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    setLoading(false);
    onClose();
  };

  const isValid = selectedReason && (selectedReason !== 'other' || customReason.trim());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Mark as Undeliverable
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800">
              <strong>Customer:</strong> {booking.customer_name}
            </p>
            <p className="text-sm text-orange-800">
              <strong>Booking ID:</strong> #{booking.id.substring(0, 8)}
            </p>
          </div>

          <div>
            <Label htmlFor="failure-reason">Reason for delivery failure *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {FAILURE_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason.charAt(0).toUpperCase() + reason.slice(1)}
                  </SelectItem>
                ))}
                <SelectItem value="other">Other (specify below)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedReason === 'other' && (
            <div>
              <Label htmlFor="custom-reason">Custom reason *</Label>
              <Textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please describe the reason..."
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={!isValid || loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Processing...' : 'Mark Undeliverable'}
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
