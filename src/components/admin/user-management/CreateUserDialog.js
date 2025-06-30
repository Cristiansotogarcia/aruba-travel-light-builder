import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateTempPassword } from '@/utils/passwordUtils';
export const CreateUserDialog = ({ onUserCreated, onRefreshProfiles }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Driver' });
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
        }
        catch (error) {
            console.error('Error creating user:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create user",
                variant: "destructive",
            });
        }
        finally {
            setCreating(false);
        }
    };
    return (_jsxs(Dialog, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { children: [_jsx(UserPlus, { className: "h-4 w-4 mr-2" }), "Add User"] }) }), _jsxs(DialogContent, { className: "max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Create New User" }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "name", children: "Name" }), _jsx(Input, { id: "name", value: newUser.name, onChange: (e) => setNewUser({ ...newUser, name: e.target.value }), placeholder: "Enter user name" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", type: "email", value: newUser.email, onChange: (e) => setNewUser({ ...newUser, email: e.target.value }), placeholder: "Enter email address" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "role", children: "Role" }), _jsxs(Select, { value: newUser.role, onValueChange: (value) => setNewUser({ ...newUser, role: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select role" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Driver", children: "Driver" }), _jsx(SelectItem, { value: "Booker", children: "Booker" }), _jsx(SelectItem, { value: "Admin", children: "Admin" }), _jsx(SelectItem, { value: "SuperUser", children: "SuperUser" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "password", children: "Password (OTP):" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "password", type: showPassword ? "text" : "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Enter password or generate one", className: "pr-10" }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "absolute right-0 top-0 h-full px-3", onClick: () => setShowPassword(!showPassword), children: showPassword ? _jsx(EyeOff, { className: "h-4 w-4" }) : _jsx(Eye, { className: "h-4 w-4" }) })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "confirmPassword", children: "Confirm password:" }), _jsx(Input, { id: "confirmPassword", type: showPassword ? "text" : "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "Confirm password" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { type: "button", variant: "outline", onClick: generateRandomPassword, className: "flex-1", children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Generate"] }), _jsx(Button, { type: "button", variant: "outline", onClick: clearPassword, className: "flex-1", children: "Clear" }), _jsx(Button, { type: "button", variant: "outline", onClick: copyPassword, disabled: !password, children: _jsx(Copy, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3", children: _jsxs("p", { className: "text-sm text-blue-700", children: [_jsx("strong", { children: "Note:" }), " The user will need to change this password on their first login."] }) }), _jsx(Button, { onClick: handleCreateUser, className: "w-full", disabled: creating, children: creating ? 'Creating User...' : 'Create User' })] })] })] }));
};
