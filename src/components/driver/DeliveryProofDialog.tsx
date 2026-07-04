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

interface DeliveryProofDialogProps {
  bookingId: string;
  customerName: string;
  onClose: () => void;
  onCompleted: (slipId: string | null) => Promise<void> | void;
  open: boolean;
  taskId: string;
}

export const DeliveryProofDialog = ({
  bookingId,
  customerName,
  onClose,
  onCompleted,
  open,
  taskId,
}: DeliveryProofDialogProps) => {
  const [notes, setNotes] = useState('');
  const [signedByName, setSignedByName] = useState(customerName);
  const [submitting, setSubmitting] = useState(false);
  const signatureRef = useRef<SignaturePadHandle | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setNotes('');
      setSignedByName(customerName);
      signatureRef.current?.clear();
    }
  }, [customerName, open]);

  const handleSubmit = async () => {
    const signaturePad = signatureRef.current;
    if (!signaturePad || signaturePad.isEmpty()) {
      toast({
        title: 'Signature Required',
        description: 'Capture the customer signature before completing the delivery.',
        variant: 'destructive',
      });
      return;
    }

    const signatureBlob = await signaturePad.toBlob();
    if (!signatureBlob) {
      toast({
        title: 'Signature Error',
        description: 'The signature image could not be prepared.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const filePath = `bookings/${bookingId}/tasks/${taskId}/signature-${Date.now()}.png`;
      const signatureFile = new File([signatureBlob], 'delivery-signature.png', {
        type: 'image/png',
      });

      const uploadResult = await supabase.storage
        .from('delivery-proofs')
        .upload(filePath, signatureFile, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const completionResult = await supabase.rpc('complete_delivery_task', {
        p_task_id: taskId,
        p_signed_by_name: signedByName.trim(),
        p_signature_path: uploadResult.data.path,
        p_notes: notes.trim() || undefined,
      });

      if (completionResult.error) {
        throw completionResult.error;
      }

      const payload = (completionResult.data || null) as { slip_id?: string | null } | null;
      const slipId = payload?.slip_id ?? null;

      const emailResult = slipId
        ? await supabase.functions.invoke('send-delivery-proof-email', {
            body: { delivery_slip_id: slipId },
          })
        : null;

      if (emailResult?.error) {
        toast({
          title: 'Delivery Completed',
          description: 'Proof was saved, but the delivery email could not be sent.',
        });
      } else {
        toast({
          title: 'Delivery Completed',
          description: 'The signed delivery slip was created and emailed to the customer.',
        });
      }

      await onCompleted(slipId);
      onClose();
    } catch (error) {
      console.error('Error completing delivery task:', error);
      toast({
        title: 'Delivery Completion Failed',
        description: error instanceof Error ? error.message : 'The delivery could not be completed.',
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
          <DialogTitle>Capture Proof of Delivery</DialogTitle>
          <DialogDescription>
            Have the customer sign on screen. This will create the delivery slip, store the proof, and send the confirmation email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="signed-by-name">Signed by</Label>
            <Input
              id="signed-by-name"
              value={signedByName}
              onChange={(event) => setSignedByName(event.target.value)}
              placeholder="Recipient full name"
            />
          </div>

          <div className="space-y-2">
            <Label>Customer signature</Label>
            <SignaturePad ref={signatureRef} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-notes">Delivery notes</Label>
            <Textarea
              id="delivery-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Leave any proof-of-delivery notes here."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !signedByName.trim()}>
            {submitting ? 'Saving proof...' : 'Complete Delivery'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
