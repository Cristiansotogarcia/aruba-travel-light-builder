
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

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
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDeactivateUser = async () => {
    if (!user) return;

    setDeleting(true);

    try {
      console.log('Calling admin user operations edge function for deactivation');
      
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          action: 'deactivate_user',
          userId: user.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data.error) {
        console.error('Admin operation error:', data.error);
        throw new Error(data.error);
      }

      console.log('User deactivation successful');
      toast({
        title: "User Deactivated",
        description: `${user.name} has been deactivated successfully.`,
      });

      onUserDeleted();
      onClose();
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

    setDeleting(true);

    try {
      console.log('Calling admin user operations edge function for deletion');
      
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          action: 'delete_user',
          userId: user.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data.error) {
        console.error('Admin operation error:', data.error);
        throw new Error(data.error);
      }

      console.log('User deletion successful');
      toast({
        title: "User Deleted",
        description: `${user.name} has been permanently deleted.`,
      });

      onUserDeleted();
      onClose();
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete User: {user?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Choose an action:</h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-red-700 mb-2">
                  <strong>Deactivate:</strong> User cannot login but data is preserved. Can be reactivated later.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleDeactivateUser} 
                  disabled={deleting}
                  className="w-full"
                >
                  {deleting ? 'Deactivating...' : 'Deactivate User'}
                </Button>
              </div>
              
              <div className="border-t pt-3">
                <p className="text-sm text-red-700 mb-2">
                  <strong>Permanent Delete:</strong> User and all associated data will be permanently removed. This cannot be undone.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteUser} 
                  disabled={deleting}
                  className="w-full"
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete User'}
                </Button>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
