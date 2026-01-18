import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Package
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BookingConfirmationModalProps {
  reservation: {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    start_date: string;
    end_date: string;
    delivery_slot: 'morning' | 'afternoon';
    total_amount: number;
    items: Array<{
      equipment_name: string;
      quantity: number;
      equipment_price: number;
      subtotal: number;
    }>;
  };
  onClose: () => void;
  onComplete: () => void;
}

export const BookingConfirmationModal = ({
  reservation,
  onClose,
  onComplete
}: BookingConfirmationModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'confirm' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [stockCheck, setStockCheck] = useState<{
    available: boolean;
    issues: string[];
  } | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);

  // Fetch payment link from settings on component mount
  useEffect(() => {
    const fetchPaymentLink = async () => {
      const { data } = await supabase
        .from('content_blocks')
        .select('content')
        .eq('block_key', 'payment_link')
        .eq('page_slug', 'global')
        .maybeSingle();
      
      if (data?.content) {
        setPaymentLink(data.content);
      }
    };
    fetchPaymentLink();
  }, []);

  const checkStockAvailability = async () => {
    setCheckingStock(true);
    const issues: string[] = [];

    try {
      for (const item of reservation.items) {
        // Get current stock
        const { data: equipment, error } = await supabase
          .from('equipment')
          .select('name, stock_quantity')
          .eq('name', item.equipment_name)
          .single();

        if (error || !equipment) {
          issues.push(`Could not verify stock for ${item.equipment_name}`);
          continue;
        }

        if (equipment.stock_quantity < item.quantity) {
          issues.push(
            `${item.equipment_name}: Requested ${item.quantity}, Available ${equipment.stock_quantity}`
          );
        }
      }

      setStockCheck({
        available: issues.length === 0,
        issues
      });
    } catch (error) {
      console.error('Error checking stock:', error);
      setStockCheck({
        available: false,
        issues: ['Error checking stock availability']
      });
    } finally {
      setCheckingStock(false);
    }
  };

  const handleConfirm = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to confirm reservations',
        variant: 'destructive'
      });
      return;
    }

    // Check stock first if not already checked
    if (!stockCheck) {
      await checkStockAvailability();
      return;
    }

    if (!stockCheck.available) {
      toast({
        title: 'Stock Insufficient',
        description: 'Cannot confirm reservation due to stock issues',
        variant: 'destructive'
      });
      return;
    }

    // Show payment link input if not in confirm action yet
    if (action !== 'confirm') {
      setAction('confirm');
      return;
    }

    // Validate payment link
    if (!paymentLink.trim()) {
      toast({
        title: 'Payment Link Required',
        description: 'Please enter the payment link to send to the customer',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Update booking status, admin confirmation, and payment link
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'pending',
          payment_status: 'pending',
          admin_confirmed_at: new Date().toISOString(),
          admin_confirmed_by: user.id,
          payment_link_url: paymentLink.trim(),
          payment_link_generated_at: new Date().toISOString()
        })
        .eq('id', reservation.id);

      if (updateError) throw updateError;

      // Step 2: Send payment link email to customer
      try {
        await supabase.functions.invoke('send-payment-link-email', {
          body: {
            booking_id: reservation.id,
            customer_name: reservation.customer_name,
            customer_email: reservation.customer_email,
            payment_link: paymentLink.trim(),
            total_amount: reservation.total_amount
          }
        });
      } catch (emailError) {
        console.error('Failed to send payment link email:', emailError);
        // Don't fail the confirmation if email fails
      }

      toast({
        title: 'Payment Link Sent',
        description: 'Reservation is pending payment confirmation.',
        variant: 'default'
      });

      onComplete();
    } catch (error: unknown) {
      console.error('Error confirming reservation:', error);
      const message = error instanceof Error ? error.message : 'An error occurred while confirming the reservation';
      toast({
        title: 'Confirmation Failed',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to reject reservations',
        variant: 'destructive'
      });
      return;
    }

    if (!rejectionReason.trim()) {
      toast({
        title: 'Rejection Reason Required',
        description: 'Please provide a reason for rejecting this reservation',
        variant: 'destructive'
      });
      return;
    }

    setAction('reject');
    setIsProcessing(true);

    try {
      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', reservation.id);

      if (updateError) throw updateError;

      // Send rejection email
      try {
        await supabase.functions.invoke('send-rejection-email', {
          body: {
            booking_id: reservation.id,
            customer_name: reservation.customer_name,
            customer_email: reservation.customer_email,
            rejection_reason: rejectionReason.trim()
          }
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // Don't fail the rejection if email fails
      }

      toast({
        title: 'Reservation Rejected',
        description: 'The customer has been notified',
        variant: 'default'
      });

      onComplete();
    } catch (error: unknown) {
      console.error('Error rejecting reservation:', error);
      const message = error instanceof Error ? error.message : 'An error occurred while rejecting the reservation';
      toast({
        title: 'Rejection Failed',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="text-base">Review Reservation</DialogTitle>
          <DialogDescription className="text-xs">
            Review the reservation details and confirm or reject
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 px-4 overflow-y-auto flex-1 min-h-0">
          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-1.5 text-xs uppercase tracking-wide text-gray-700">Customer Information</h3>
            <div className="bg-gray-50 rounded p-2 space-y-1 text-xs">
              <p><span className="font-medium">Name:</span> {reservation.customer_name}</p>
              <p><span className="font-medium">Email:</span> {reservation.customer_email}</p>
              <p><span className="font-medium">Phone:</span> {reservation.customer_phone}</p>
            </div>
          </div>

          {/* Booking Details */}
          <div>
            <h3 className="font-semibold mb-1.5 text-xs uppercase tracking-wide text-gray-700">Booking Details</h3>
            <div className="bg-gray-50 rounded p-2 space-y-1 text-xs">
              <p>
                <span className="font-medium">Delivery:</span>{' '}
                {new Date(reservation.start_date).toLocaleDateString()} -{' '}
                {reservation.delivery_slot === 'morning' ? 'Morning (9AM-12PM)' : 'Afternoon (1PM-5PM)'}
              </p>
              <p>
                <span className="font-medium">Pickup:</span>{' '}
                {new Date(reservation.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Equipment Items */}
          <div>
            <h3 className="font-semibold mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-700">
              <Package className="h-3 w-3" />
              Equipment ({reservation.items.length} items)
            </h3>
            <div className="bg-gray-50 rounded p-2 space-y-1">
              {reservation.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span>
                    {item.equipment_name} <span className="text-gray-600">x{item.quantity}</span>
                  </span>
                  <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-gray-300 font-bold text-xs">
                <span>Total</span>
                <span className="text-primary">${reservation.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Stock Availability Check */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-gray-700">Stock Availability</h3>
              {!stockCheck && !checkingStock && (
                <Button onClick={checkStockAvailability} size="sm" variant="outline" className="h-7 text-xs px-2">
                  Check Stock
                </Button>
              )}
            </div>
            {checkingStock && (
              <Alert className="py-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <AlertDescription className="text-xs">Checking stock availability...</AlertDescription>
              </Alert>
            )}
            {stockCheck && (
              <Alert variant={stockCheck.available ? 'default' : 'destructive'} className="py-2">
                {stockCheck.available ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      All requested items are in stock
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription>
                      <p className="font-medium mb-1 text-xs">Stock Issues:</p>
                      <ul className="list-disc list-inside space-y-0 text-xs">
                        {stockCheck.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}
          </div>

          {/* Payment Link Input (shown when confirming) */}
          {action === 'confirm' && (
            <div>
              <Label htmlFor="payment-link" className="text-xs font-semibold">Payment Link *</Label>
              <Input
                id="payment-link"
                type="url"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder="https://your-payment-link.com/..."
                className="mt-1 h-8 text-xs"
              />
              <p className="text-[10px] text-gray-600 mt-0.5">
                Enter your payment link. This will be sent to {reservation.customer_email}
              </p>
            </div>
          )}

          {/* Rejection Reason (shown when rejecting) */}
          {action === 'reject' && (
            <div>
              <Label htmlFor="rejection-reason" className="text-xs font-semibold">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this reservation is being rejected..."
                rows={2}
                className="mt-1 text-xs"
              />
              <p className="text-[10px] text-gray-600 mt-0.5">
                This reason will be included in the rejection email to the customer
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-4 py-3 border-t flex gap-2 bg-white shrink-0">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isProcessing}
            className="h-8 text-xs px-3"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (action === 'reject') {
                handleReject();
              } else {
                setAction('reject');
              }
            }}
            variant="destructive"
            disabled={isProcessing}
            className="h-8 text-xs px-3"
          >
            {isProcessing && action === 'reject' ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="mr-1.5 h-3 w-3" />
                {action === 'reject' ? 'Confirm Rejection' : 'Reject'}
              </>
            )}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || (stockCheck !== null && !stockCheck.available)}
            className="h-8 text-xs px-3"
          >
            {isProcessing && action === 'confirm' ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="mr-1.5 h-3 w-3" />
                Confirm & Send Payment Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingConfirmationModal;
