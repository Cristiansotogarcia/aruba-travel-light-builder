import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card imports
import { Badge } from '@/components/ui/badge'; // Added Badge import
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { useToast } from '@/hooks/use-toast';
// import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, KeyRound, UserX } from 'lucide-react'; // Removed RefreshCcw, Eye, EyeOff, UserCheck
import { EditUserModal } from './EditUserModal';
import { DeleteUserModal } from './DeleteUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
export const UserList = ({ profiles, loading, onRefreshProfiles }) => {
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'SuperUser':
                return 'bg-red-100 text-red-800';
            case 'Admin':
                return 'bg-blue-100 text-blue-800';
            case 'Booker':
                return 'bg-green-100 text-green-800';
            case 'Driver':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    const handleEditUser = (user) => {
        setSelectedUser(user);
        setEditModalOpen(true);
    };
    const handleResetPassword = (user) => {
        setSelectedUser(user);
        setResetPasswordModalOpen(true);
    };
    const handleDeleteUser = (user) => {
        setSelectedUser(user);
        setDeleteModalOpen(true);
    };
    if (loading) {
        return (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-8 bg-gray-200 rounded w-1/3 mb-4" }), _jsx("div", { className: "space-y-4", children: [...Array(3)].map((_, i) => (_jsx("div", { className: "h-16 bg-gray-200 rounded" }, i))) })] }) }));
    }
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["Users (", profiles.length, ")"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-4", children: profiles.length > 0 ? (profiles.map((profile) => (_jsxs("div", { className: "flex items-center justify-between p-4 border border-gray-200 rounded-lg", children: [_jsx("div", { className: "flex-1", children: _jsx("div", { className: "flex items-center gap-3", children: _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-medium text-gray-900", children: profile.name }), profile.is_deactivated && (_jsxs(Badge, { variant: "destructive", className: "text-xs", children: [_jsx(UserX, { className: "h-3 w-3 mr-1" }), "Deactivated"] }))] }), _jsxs("div", { className: "text-sm text-gray-500", children: ["ID: ", profile.id] }), _jsxs("div", { className: "text-sm text-gray-500", children: ["Created: ", profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'] })] }) }) }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Badge, { className: getRoleBadgeColor(profile.role), children: profile.role }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => handleEditUser(profile), title: "Edit user", children: _jsx(Edit, { className: "h-4 w-4" }) }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => handleResetPassword(profile), title: "Reset password", children: _jsx(KeyRound, { className: "h-4 w-4" }) }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => handleDeleteUser(profile), title: "Delete/Deactivate user", children: _jsx(Trash2, { className: "h-4 w-4" }) })] })] })] }, profile.id)))) : (_jsx("p", { className: "text-gray-500 text-center py-8", children: "No users found" })) }) })] }), _jsx(EditUserModal, { open: editModalOpen, onClose: () => setEditModalOpen(false), user: selectedUser, onUserUpdated: onRefreshProfiles }), _jsx(ResetPasswordModal, { open: resetPasswordModalOpen, onClose: () => setResetPasswordModalOpen(false), user: selectedUser, onPasswordReset: onRefreshProfiles }), _jsx(DeleteUserModal, { open: deleteModalOpen, onClose: () => setDeleteModalOpen(false), user: selectedUser, onUserDeleted: onRefreshProfiles })] }));
};
