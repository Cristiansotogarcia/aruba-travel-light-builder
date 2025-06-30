import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateTempPassword } from '@/utils/passwordUtils';
import { RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
export const ResetPasswordModal = ({ open, onClose, user, onPasswordReset }) => {
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
        }
        catch (error) {
            console.error('Error resetting password:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to reset password",
                variant: "destructive",
            });
        }
        finally {
            setResetting(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Reset Password for ", user?.name] }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "new-password", children: "New Password:" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "new-password", type: showPassword ? "text" : "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), placeholder: "Enter new password or generate one", className: "pr-10" }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "absolute right-0 top-0 h-full px-3", onClick: () => setShowPassword(!showPassword), children: showPassword ? _jsx(EyeOff, { className: "h-4 w-4" }) : _jsx(Eye, { className: "h-4 w-4" }) })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { type: "button", variant: "outline", onClick: generateRandomPassword, className: "flex-1", children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Generate"] }), _jsx(Button, { type: "button", variant: "outline", onClick: copyPassword, disabled: !newPassword, children: _jsx(Copy, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3", children: _jsxs("p", { className: "text-sm text-yellow-700", children: [_jsx("strong", { children: "Note:" }), " The user will be required to change this password on their next login."] }) }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: handleResetPassword, className: "flex-1", disabled: resetting, children: resetting ? 'Resetting...' : 'Reset Password' }), _jsx(Button, { variant: "outline", onClick: onClose, className: "flex-1", children: "Cancel" })] })] })] }) }));
};
