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
import {
  buildCollectionSignaturePath,
  completeCollectionTask,
} from '@/lib/delivery/collection';

interface CollectionProofDialogProps {
  bookingId: string;
  customerName: string;
  onClose: () => void;
  onCompleted: (receiptId: string | null) => Promise<void> | void;
  open: boolean;
  taskId: string;
}

export const CollectionProofDialog = ({
  bookingId,
  customerName,
  onClose,
  onCompleted,
  open,
  taskId,
}: CollectionProofDialogProps) => {
  const [conditionNotes, setConditionNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [signedByName, setSignedByName] = useState(customerName);
  const [submitting, setSubmitting] = useState(false);
  const signatureRef = useRef<SignaturePadHandle | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setConditionNotes('');
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
        description: 'Capture the customer signature before completing the collection.',
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
      const filePath = buildCollectionSignaturePath(bookingId, taskId);
      const signatureFile = new File([signatureBlob], 'collection-signature.png', {
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

      const { slipId } = await completeCollectionTask({
        taskId,
        signedByName: signedByName.trim(),
        signaturePath: uploadResult.data.path,
        conditionNotes: conditionNotes.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      const emailResult = slipId
        ? await supabase.functions.invoke('send-collection-receipt-email', {
            body: { collection_receipt_id: slipId },
          })
        : null;

      if (emailResult?.error) {
        toast({
          title: 'Collection Completed',
          description: 'The receipt was saved, but the confirmation email could not be sent.',
        });
      } else {
        toast({
          title: 'Collection Completed',
          description: 'The signed collection receipt was created and emailed to the customer.',
        });
      }

      await onCompleted(slipId);
      onClose();
    } catch (error) {
      console.error('Error completing collection task:', error);
      toast({
        title: 'Collection Completion Failed',
        description: error instanceof Error ? error.message : 'The collection could not be completed.',
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
          <DialogTitle>Capture Proof of Collection</DialogTitle>
          <DialogDescription>
            Record the equipment condition and have the customer sign on screen. This will create the
            collection receipt, store the proof, and send the confirmation email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="collected-by-name">Collected from</Label>
            <Input
              id="collected-by-name"
              value={signedByName}
              onChange={(event) => setSignedByName(event.target.value)}
              placeholder="Name of the person handing over the equipment"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition-notes">Equipment condition</Label>
            <Textarea
              id="condition-notes"
              value={conditionNotes}
              onChange={(event) => setConditionNotes(event.target.value)}
              placeholder="Describe the state of the equipment on return (damage, missing parts, cleanliness)."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Customer signature</Label>
            <SignaturePad ref={signatureRef} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="collection-notes">Collection notes</Label>
            <Textarea
              id="collection-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Leave any additional collection notes here."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !signedByName.trim()}>
            {submitting ? 'Saving proof...' : 'Complete Collection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
