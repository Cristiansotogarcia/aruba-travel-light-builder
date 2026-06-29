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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { DepotPickup } from './HandoverDialog';

interface ReturnDialogProps {
  pickup: DepotPickup;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export const ReturnDialog = ({
  pickup,
  open,
  onClose,
  onCompleted,
}: ReturnDialogProps) => {
  const [returnedByName, setReturnedByName] = useState('');
  const [conditionNote, setConditionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setReturnedByName('');
      setConditionNote('');
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('complete_depot_return', {
        p_booking_id: pickup.booking_id,
        p_returned_by_name: returnedByName.trim() || null,
        p_condition_note: conditionNote.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Return Checked In',
        description: `Equipment for booking ${pickup.pickup_code} has been checked in.`,
      });

      onCompleted();
      onClose();
    } catch (error) {
      console.error('Error completing depot return:', error);
      toast({
        title: 'Return Failed',
        description: error instanceof Error ? error.message : 'The return could not be checked in.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Check In Return</DialogTitle>
          <DialogDescription>
            Record the return of equipment for booking{' '}
            <span className="font-mono font-semibold">{pickup.pickup_code}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="returned-by-name">Returned by (optional)</Label>
            <Input
              id="returned-by-name"
              value={returnedByName}
              onChange={(e) => setReturnedByName(e.target.value)}
              placeholder="Name of person returning equipment"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition-note">Condition note (optional)</Label>
            <Textarea
              id="condition-note"
              value={conditionNote}
              onChange={(e) => setConditionNote(e.target.value)}
              placeholder="Note any damage or condition issues…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Confirm Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
