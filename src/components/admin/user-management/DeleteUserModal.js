import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
export const DeleteUserModal = ({ open, onClose, user, onUserDeleted }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const handleDeactivateUser = async () => {
        if (!user)
            return;
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
        }
        catch (error) {
            console.error('Error deactivating user:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to deactivate user",
                variant: "destructive",
            });
        }
        finally {
            setDeleting(false);
        }
    };
    const handleDeleteUser = async () => {
        if (!user)
            return;
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
        }
        catch (error) {
            console.error('Error deleting user:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete user",
                variant: "destructive",
            });
        }
        finally {
            setDeleting(false);
        }
    };
    const handleClose = () => {
        setPassword('');
        setConfirmationText('');
        setShowPassword(false);
        onClose();
    };
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "h-5 w-5 text-red-500" }), "Delete User: ", user?.name] }) }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: [_jsx("h4", { className: "font-medium text-red-800 mb-2", children: "Choose an action:" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm text-red-700 mb-3", children: [_jsx("strong", { children: "Deactivate:" }), " User cannot login but data is preserved. Can be reactivated later."] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "deactivate-password", children: "Enter your password to confirm:" }), _jsxs("div", { className: "relative mt-1", children: [_jsx(Input, { id: "deactivate-password", type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Your account password", className: "pr-10" }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent", onClick: () => setShowPassword(!showPassword), children: showPassword ? (_jsx(EyeOff, { className: "h-4 w-4" })) : (_jsx(Eye, { className: "h-4 w-4" })) })] })] }), _jsx(Button, { variant: "outline", onClick: handleDeactivateUser, disabled: deleting || !password.trim(), className: "w-full", children: deleting ? 'Deactivating...' : 'Deactivate User' })] })] }), _jsxs("div", { className: "border-t pt-4", children: [_jsxs("p", { className: "text-sm text-red-700 mb-3", children: [_jsx("strong", { children: "Permanent Delete:" }), " User and all associated data will be permanently removed. This cannot be undone."] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "delete-confirmation", children: "Type \"DELETE\" to confirm:" }), _jsx(Input, { id: "delete-confirmation", value: confirmationText, onChange: (e) => setConfirmationText(e.target.value), placeholder: "Type DELETE to confirm", className: "mt-1" })] }), _jsx(Button, { variant: "destructive", onClick: handleDeleteUser, disabled: deleting || !password.trim() || confirmationText.toLowerCase() !== 'delete', className: "w-full", children: deleting ? 'Deleting...' : 'Permanently Delete User' })] })] })] })] }), _jsx(Button, { variant: "outline", onClick: handleClose, className: "w-full", children: "Cancel" })] })] }) }));
};
