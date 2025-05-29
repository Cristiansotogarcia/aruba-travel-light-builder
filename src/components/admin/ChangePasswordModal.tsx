
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validatePassword } from '@/utils/passwordUtils';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onPasswordChanged: () => void;
}

export const ChangePasswordModal = ({ open, onClose, onPasswordChanged }: ChangePasswordModalProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    if (!currentPassword.trim()) {
      toast({
        title: "Current Password Required",
        description: "Please enter your current temporary password.",
        variant: "destructive"
      });
      return;
    }

    if (!newPassword.trim()) {
      toast({
        title: "New Password Required",
        description: "Please enter a new password.",
        variant: "destructive"
      });
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Invalid Password",
        description: passwordValidation.message,
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation don't match.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // First verify the current password
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-password', {
        body: { 
          email: (await supabase.auth.getUser()).data.user?.email,
          password: currentPassword 
        }
      });

      if (verifyError || !verifyData?.success) {
        toast({
          title: "Invalid Current Password",
          description: "The current password you entered is incorrect.",
          variant: "destructive"
        });
        return;
      }

      // Update the password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Mark temp password as used and update profile
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        // Mark temp password as used
        await supabase
          .from('user_temp_passwords')
          .update({ is_used: true })
          .eq('user_id', user.id)
          .eq('is_used', false);

        // Update profile to indicate password has been changed
        await supabase
          .from('profiles')
          .update({ needs_password_change: false })
          .eq('id', user.id);
      }

      toast({
        title: "Password Changed Successfully",
        description: "Your password has been updated. Please sign in with your new password.",
      });

      onPasswordChanged();
      onClose();

    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error Changing Password",
        description: "There was an error changing your password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              You are currently using a temporary password. Please change it to a secure password of your choice.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Temporary Password</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your temporary password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
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
              onClick={handlePasswordChange} 
              disabled={loading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
              className="flex-1"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
