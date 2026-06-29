import { useEffect, useRef, useState } from 'react';

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
import { SignaturePad, type SignaturePadHandle } from '@/components/driver/SignaturePad';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { queueAction } from '@/lib/offline/depotDb';

export interface DepotPickup {
  booking_id: string;
  pickup_code: string;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  status: string;
  items: { equipment_name: string; quantity: number }[];
  next_action: 'handover' | 'return';
}

interface HandoverDialogProps {
  pickup: DepotPickup;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export const HandoverDialog = ({
  pickup,
  open,
  onClose,
  onCompleted,
}: HandoverDialogProps) => {
  const [collectedByName, setCollectedByName] = useState(pickup.customer_name);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const signatureRef = useRef<SignaturePadHandle | null>(null);
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!open) {
      setCollectedByName(pickup.customer_name);
      setNotes('');
      signatureRef.current?.clear();
    }
  }, [open, pickup.customer_name]);

  const handleSubmit = async () => {
    if (!collectedByName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter the name of the person collecting the equipment.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Signature upload requires a live connection — skip when offline and
      // note it in the queued payload so the operator can re-capture it later
      // if needed.
      let signaturePath: string | null = null;

      if (isOnline) {
        const signaturePad = signatureRef.current;
        if (signaturePad && !signaturePad.isEmpty()) {
          const signatureBlob = await signaturePad.toBlob();
          if (signatureBlob) {
            const filePath = `bookings/${pickup.booking_id}/depot/handover-signature-${Date.now()}.png`;
            const signatureFile = new File([signatureBlob], 'handover-signature.png', {
              type: 'image/png',
            });

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('delivery-proofs')
              .upload(filePath, signatureFile, {
                contentType: 'image/png',
                upsert: true,
              });

            if (uploadError) throw uploadError;
            signaturePath = uploadData.path;
          }
        }
      }

      const rpcArgs = {
        p_booking_id: pickup.booking_id,
        p_collected_by_name: collectedByName.trim(),
        p_signature_path: signaturePath,
        p_notes: notes.trim() || null,
      };

      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).rpc('complete_depot_handover', rpcArgs);
        if (error) {
          // Check if it's a network failure — fall through to the offline queue.
          const msg: string =
            error instanceof Error ? error.message : String(error.message ?? error);
          const isNetworkError =
            msg.toLowerCase().includes('failed to fetch') ||
            msg.toLowerCase().includes('network') ||
            msg.toLowerCase().includes('load failed');

          if (!isNetworkError) throw error;

          // Network failure despite navigator.onLine — queue it.
          await queueAction({
            type: 'handover',
            rpcName: 'complete_depot_handover',
            args: rpcArgs,
            createdAt: Date.now(),
          });

          toast({
            title: 'Saved offline',
            description: 'Will sync automatically when back online.',
          });
        } else {
          toast({
            title: 'Hand-over Complete',
            description: `Equipment handed over to ${collectedByName.trim()}.`,
          });
        }
      } else {
        // Offline — queue the action.
        await queueAction({
          type: 'handover',
          rpcName: 'complete_depot_handover',
          args: rpcArgs,
          createdAt: Date.now(),
        });

        toast({
          title: 'Saved offline',
          description: 'Will sync automatically when back online.',
        });
      }

      onCompleted();
      onClose();
    } catch (err) {
      console.error('Error completing depot handover:', err);
      toast({
        title: 'Hand-over Failed',
        description: err instanceof Error ? err.message : 'The hand-over could not be completed.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Hand Over Equipment</DialogTitle>
          <DialogDescription>
            Record who is collecting the equipment for booking{' '}
            <span className="font-mono font-semibold">{pickup.pickup_code}</span>.
            A signature is optional but recommended.
            {!isOnline && (
              <span className="ml-1 text-amber-600">(Offline — action will be queued.)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="collected-by-name">Collected by (required)</Label>
            <Input
              id="collected-by-name"
              value={collectedByName}
              onChange={(e) => setCollectedByName(e.target.value)}
              placeholder="Full name of person collecting"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Signature (optional{!isOnline ? ' — skipped offline' : ''})</Label>
            <SignaturePad ref={signatureRef} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="handover-notes">Notes (optional)</Label>
            <Textarea
              id="handover-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the hand-over…"
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
            disabled={submitting || !collectedByName.trim()}
          >
            {submitting ? 'Saving…' : 'Confirm Hand-over'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
