
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  name: string;
  role: 'SuperUser' | 'Admin' | 'Booker' | 'Driver';
  created_at: string | null;
  needs_password_change?: boolean | null;
  email?: string;
  is_deactivated?: boolean | null;
}

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  user: Profile | null;
  onUserUpdated: () => void;
}

export const EditUserModal = ({ open, onClose, user, onUserUpdated }: EditUserModalProps) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'SuperUser' | 'Admin' | 'Booker' | 'Driver'>('Driver');
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setIsDeactivated(user.is_deactivated || false);
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!user || !name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          role: role,
          is_deactivated: isDeactivated
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "User Updated",
        description: `User ${name} has been updated successfully.`,
      });

      onUserUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter user name"
            />
          </div>
          
          <div>
            <Label htmlFor="edit-role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Driver">Driver</SelectItem>
                <SelectItem value="Booker">Booker</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="SuperUser">SuperUser</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is-deactivated"
              checked={isDeactivated}
              onChange={(e) => setIsDeactivated(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="is-deactivated">Deactivate user</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpdate} className="flex-1" disabled={updating}>
              {updating ? 'Updating...' : 'Update User'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
