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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '@/lib/delivery/serviceTasks';

interface TaskEtaDialogProps {
  customerName: string;
  etaEnd?: string | null;
  etaStart?: string | null;
  mode: 'start' | 'update';
  onClose: () => void;
  onConfirm: (values: { etaStart: string; etaEnd: string }) => Promise<void>;
  open: boolean;
  taskLabel: string;
}

export const TaskEtaDialog = ({
  customerName,
  etaEnd,
  etaStart,
  mode,
  onClose,
  onConfirm,
  open,
  taskLabel,
}: TaskEtaDialogProps) => {
  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStartValue(toDateTimeLocalValue(etaStart));
    setEndValue(toDateTimeLocalValue(etaEnd));
  }, [etaEnd, etaStart, open]);

  const handleSubmit = async () => {
    const nextStart = fromDateTimeLocalValue(startValue);
    const nextEnd = fromDateTimeLocalValue(endValue);

    if (!nextStart || !nextEnd) {
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        etaStart: nextStart,
        etaEnd: nextEnd,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isInvalid = !startValue || !endValue || new Date(endValue).getTime() <= new Date(startValue).getTime();

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'start' ? 'Start Task' : 'Update ETA'}</DialogTitle>
          <DialogDescription>
            {taskLabel} for {customerName}. Set the expected arrival window shown to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eta-start">Expected from</Label>
            <Input
              id="eta-start"
              type="datetime-local"
              value={startValue}
              onChange={(event) => setStartValue(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eta-end">Expected until</Label>
            <Input
              id="eta-end"
              type="datetime-local"
              value={endValue}
              onChange={(event) => setEndValue(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || isInvalid}>
            {submitting ? 'Saving...' : mode === 'start' ? 'Start Task' : 'Save ETA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
