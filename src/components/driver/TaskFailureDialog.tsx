import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TaskFailureDialogProps {
  customerName: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  open: boolean;
}

export const TaskFailureDialog = ({
  customerName,
  onClose,
  onConfirm,
  open,
}: TaskFailureDialogProps) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    const nextReason = reason.trim();
    if (!nextReason) return;

    setSubmitting(true);
    try {
      await onConfirm(nextReason);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark Delivery as Failed</DialogTitle>
          <DialogDescription>
            Provide the reason for the failed delivery to update the booking and customer notifications for {customerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="failure-reason">Reason</Label>
          <Textarea
            id="failure-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Customer unreachable, wrong address, no access to room, etc."
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={submitting || !reason.trim()}>
            {submitting ? 'Saving...' : 'Mark Failed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
