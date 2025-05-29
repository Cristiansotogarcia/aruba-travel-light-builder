
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TempPasswordResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tempPassword: string;
}

interface CreateUserDialogProps {
  onUserCreated: (result: TempPasswordResult) => void;
  onRefreshProfiles: () => void;
}

export const CreateUserDialog = ({ onUserCreated, onRefreshProfiles }: CreateUserDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Driver' as const });
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user-with-otp', {
        body: {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to create user');
      }

      onUserCreated(data);
      setIsOpen(false);
      setNewUser({ name: '', email: '', role: 'Driver' });
      
      // Refresh profiles list
      await onRefreshProfiles();

      toast({
        title: "User Created Successfully",
        description: `User ${data.user.name} has been created with a temporary password.`,
      });

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="Enter user name"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={newUser.role}
              onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
            >
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
          <Button onClick={handleCreateUser} className="w-full" disabled={creating}>
            {creating ? 'Creating User...' : 'Create User'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
