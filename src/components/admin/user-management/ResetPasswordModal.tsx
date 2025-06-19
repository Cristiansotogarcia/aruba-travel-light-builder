
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateTempPassword } from '@/utils/passwordUtils';
import { RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
import type { Profile } from '@/types/types';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  user: Profile | null;
  onPasswordReset: () => void;
}

export const ResetPasswordModal = ({ open, onClose, user, onPasswordReset }: ResetPasswordModalProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  const generateRandomPassword = () => {
    const randomPassword = generateTempPassword(12);
    setNewPassword(randomPassword);
    toast({
      title: "Password Generated",
      description: "Random password has been generated",
    });
  };

  const copyPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      toast({
        title: "Copied",
        description: "Password copied to clipboard",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!user || !newPassword.trim()) {
      toast({
        title: "Missing Information",
        description: "Please generate or enter a new password",
        variant: "destructive",
      });
      return;
    }

    setResetting(true);

    try {
      console.log('Calling admin user operations edge function for password reset');
      
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          action: 'reset_password',
          userId: user.id,
          data: {
            password: newPassword
          }
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

      console.log('Password reset successful');
      toast({
        title: "Password Reset",
        description: `Password has been reset for ${user.name}. They will need to change it on next login.`,
      });

      onPasswordReset();
      onClose();
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password for {user?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-password">New Password:</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password or generate one"
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
              onClick={copyPassword}
              disabled={!newPassword}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> The user will be required to change this password on their next login.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleResetPassword} className="flex-1" disabled={resetting}>
              {resetting ? 'Resetting...' : 'Reset Password'}
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
