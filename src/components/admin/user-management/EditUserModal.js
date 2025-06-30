import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Added Label import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
export const EditUserModal = ({ open, onClose, user, onUserUpdated }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState('Driver');
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
            if (error)
                throw error;
            toast({
                title: "User Updated",
                description: `User ${name} has been updated successfully.`,
            });
            onUserUpdated();
            onClose();
        }
        catch (error) {
            console.error('Error updating user:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update user",
                variant: "destructive",
            });
        }
        finally {
            setUpdating(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Edit User" }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-name", children: "Name" }), _jsx(Input, { id: "edit-name", value: name, onChange: (e) => setName(e.target.value), placeholder: "Enter user name" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-role", children: "Role" }), _jsxs(Select, { value: role, onValueChange: (value) => setRole(value), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select role" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Driver", children: "Driver" }), _jsx(SelectItem, { value: "Booker", children: "Booker" }), _jsx(SelectItem, { value: "Admin", children: "Admin" }), _jsx(SelectItem, { value: "SuperUser", children: "SuperUser" })] })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("input", { type: "checkbox", id: "is-deactivated", checked: isDeactivated, onChange: (e) => setIsDeactivated(e.target.checked), className: "rounded border-gray-300" }), _jsx(Label, { htmlFor: "is-deactivated", children: "Deactivate user" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: handleUpdate, className: "flex-1", disabled: updating, children: updating ? 'Updating...' : 'Update User' }), _jsx(Button, { variant: "outline", onClick: onClose, className: "flex-1", children: "Cancel" })] })] })] }) }));
};
