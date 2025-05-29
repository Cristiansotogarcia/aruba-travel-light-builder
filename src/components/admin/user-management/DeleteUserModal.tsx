
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  name: string;
  role: 'SuperUser' | 'Admin' | 'Booker' | 'Driver';
  created_at: string;
  needs_password_change?: boolean;
  email?: string;
  is_deactivated?: boolean;
}

interface DeleteUserModalProps {
  open: boolean;
  onClose: () => void;
  user: Profile | null;
  onUserDeleted: () => void;
}

export const DeleteUserModal = ({ open, onClose, user, onUserDeleted }: DeleteUserModalProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const handleDeactivateUser = async () => {
    if (!user) return;

    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm deactivation.",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser?.email) {
      toast({
        title: "Authentication Error",
        description: "Unable to verify user credentials.",
        variant: "destructive"
      });
      return;
    }

    setDeleting(true);

    try {
      // Verify password using Supabase auth with user's email
      const { data, error: authError } = await supabase.functions.invoke('verify-password', {
        body: { 
          email: currentUser.email,
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

      console.log('Calling admin user operations edge function for deactivation');
      
      const { data: adminData, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          action: 'deactivate_user',
          userId: user.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (adminData.error) {
        console.error('Admin operation error:', adminData.error);
        throw new Error(adminData.error);
      }

      console.log('User deactivation successful');
      toast({
        title: "User Deactivated",
        description: `${user.name} has been deactivated successfully.`,
      });

      onUserDeleted();
      handleClose();
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate user",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

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
        description: "Please type 'DELETE' to confirm permanent deletion.",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser?.email) {
      toast({
        title: "Authentication Error",
        description: "Unable to verify user credentials.",
        variant: "destructive"
      });
      return;
    }

    setDeleting(true);

    try {
      // Verify password using Supabase auth with user's email
      const { data, error: authError } = await supabase.functions.invoke('verify-password', {
        body: { 
          email: currentUser.email,
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

      console.log('Calling admin user operations edge function for deletion');
      
      const { data: adminData, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          action: 'delete_user',
          userId: user.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (adminData.error) {
        console.error('Admin operation error:', adminData.error);
        throw new Error(adminData.error);
      }

      console.log('User deletion successful');
      toast({
        title: "User Deleted",
        description: `${user.name} has been permanently deleted.`,
      });

      onUserDeleted();
      handleClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmationText('');
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete User: {user?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Choose an action:</h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-red-700 mb-3">
                  <strong>Deactivate:</strong> User cannot login but data is preserved. Can be reactivated later.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="deactivate-password">Enter your password to confirm:</Label>
                    <div className="relative mt-1">
                      <Input
                        id="deactivate-password"
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
                  
                  <Button 
                    variant="outline" 
                    onClick={handleDeactivateUser} 
                    disabled={deleting || !password.trim()}
                    className="w-full"
                  >
                    {deleting ? 'Deactivating...' : 'Deactivate User'}
                  </Button>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-red-700 mb-3">
                  <strong>Permanent Delete:</strong> User and all associated data will be permanently removed. This cannot be undone.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="delete-confirmation">Type "DELETE" to confirm:</Label>
                    <Input
                      id="delete-confirmation"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="mt-1"
                    />
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteUser} 
                    disabled={deleting || !password.trim() || confirmationText.toLowerCase() !== 'delete'}
                    className="w-full"
                  >
                    {deleting ? 'Deleting...' : 'Permanently Delete User'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={handleClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
