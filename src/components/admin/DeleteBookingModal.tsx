
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Booking } from './calendar/types';

interface DeleteBookingModalProps {
  booking: Booking;
  onBookingDeleted: () => void;
  onClose: () => void;
  open: boolean;
}

export const DeleteBookingModal = ({ booking, onBookingDeleted, onClose, open }: DeleteBookingModalProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const { toast } = useToast();
  const { profile, user } = useAuth();

  // Check if user has permission to delete bookings
  const canDelete = profile?.role === 'SuperUser' || profile?.role === 'Admin';

  const handleDelete = async () => {
    if (!canDelete) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete bookings.",
        variant: "destructive"
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm deletion.",
        variant: "destructive"
      });
      return;
    }

    if (confirmationText.toLowerCase() !== 'delete') {
      toast({
        title: "Confirmation Required",
        description: "Please type 'DELETE' to confirm.",
        variant: "destructive"
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: "Authentication Error",
        description: "Unable to verify user credentials.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Verify password using Supabase auth with user's email
      const { data, error: authError } = await supabase.functions.invoke('verify-password', {
        body: { 
          email: user.email,
          password 
        }
      });

      if (authError || !data?.success) {
        console.error('Password verification error:', authError);
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect.",
          variant: "destructive"
        });
        return;
      }

      // Delete booking items first (foreign key dependency)
      const { error: itemsError } = await supabase
        .from('booking_items')
        .delete()
        .eq('booking_id', booking.id);

      if (itemsError) {
        console.error('Error deleting booking items:', itemsError);
        throw itemsError;
      }

      // Delete the booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      if (bookingError) {
        console.error('Error deleting booking:', bookingError);
        throw bookingError;
      }

      toast({
        title: "Booking Deleted Successfully",
        description: `Booking #${booking.id.substring(0, 8)} has been permanently deleted.`,
      });

      onBookingDeleted();
      onClose();

    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error Deleting Booking",
        description: "There was an error deleting the booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmationText('');
    setShowPassword(false);
    onClose();
  };

  if (!canDelete) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Booking
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the booking and all associated data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">Warning: This action cannot be undone</h4>
            <p className="text-sm text-red-700 mb-2">
              You are about to permanently delete booking #{booking.id.substring(0, 8)} for {booking.customer_name}.
            </p>
            <p className="text-sm text-red-700">
              This will remove all associated records and cannot be recovered.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="confirmation">Type "DELETE" to confirm:</Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Enter your password to confirm:</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your account password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={loading || !password.trim() || confirmationText.toLowerCase() !== 'delete'}
              variant="destructive"
              className="flex-1"
            >
              {loading ? 'Deleting...' : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Booking
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
