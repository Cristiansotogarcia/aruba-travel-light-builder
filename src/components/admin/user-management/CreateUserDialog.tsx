
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateTempPassword } from '@/utils/passwordUtils';

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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const generateRandomPassword = () => {
    const randomPassword = generateTempPassword(12);
    setPassword(randomPassword);
    setConfirmPassword(randomPassword);
    toast({
      title: "Password Generated",
      description: "Random password has been generated",
    });
  };

  const copyPassword = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      toast({
        title: "Copied",
        description: "Password copied to clipboard",
      });
    }
  };

  const clearPassword = () => {
    setPassword('');
    setConfirmPassword('');
  };

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please generate or enter a password for the user",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Password and confirm password do not match",
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
          role: newUser.role,
          password: password
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to create user');
      }

      onUserCreated({
        user: data.user,
        tempPassword: password
      });
      
      setIsOpen(false);
      setNewUser({ name: '', email: '', role: 'Driver' });
      setPassword('');
      setConfirmPassword('');
      
      // Refresh profiles list
      await onRefreshProfiles();

      toast({
        title: "User Created Successfully",
        description: `User ${data.user.name} has been created with the specified password.`,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new user account. The user will be required to change their password on first login.
          </DialogDescription>
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
              onValueChange={(value) => setNewUser({ ...newUser, role: value as 'Driver' | 'Booker' | 'Admin' | 'SuperUser' })}
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

          <div>
            <Label htmlFor="password">Password (OTP):</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password or generate one"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm password:</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={generateRandomPassword}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={clearPassword}
              className="flex-1"
            >
              Clear
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={copyPassword}
              disabled={!password}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> The user will need to change this password on their first login.
            </p>
          </div>

          <Button onClick={handleCreateUser} className="w-full" disabled={creating}>
            {creating ? 'Creating User...' : 'Create User'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
