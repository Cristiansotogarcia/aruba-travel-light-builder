import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { UserList } from './user-management/UserList';
import { UserManagementHeader } from './user-management/UserManagementHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TempPasswordDialog } from './user-management/TempPasswordDialog';
import { useAuth } from '@/hooks/useAuth';
import { ChangePasswordModal } from './ChangePasswordModal';
export const UserManagement = () => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [createdUserResult, setCreatedUserResult] = useState(null);
    const [showTempPasswordDialog, setShowTempPasswordDialog] = useState(false);
    const { hasPermission, profile: currentProfile } = useAuth();
    const { toast } = useToast();
    useEffect(() => {
        if (hasPermission('UserManagement')) {
            fetchProfiles();
        }
    }, [hasPermission]);
    useEffect(() => {
        // Check if current user needs to change password
        if (currentProfile?.needs_password_change) {
            setIsPasswordModalOpen(true);
        }
    }, [currentProfile]);
    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            setProfiles(data || []);
        }
        catch (error) {
            console.error('Error fetching profiles:', error);
            toast({
                title: "Error",
                description: "Failed to load user profiles",
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleUserCreated = (result) => {
        setCreatedUserResult(result);
        setShowTempPasswordDialog(true);
    };
    if (!hasPermission('UserManagement')) {
        return (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500", children: "You don't have permission to access user management." }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(UserManagementHeader, { onUserCreated: handleUserCreated, onRefreshProfiles: fetchProfiles }), _jsx(UserList, { profiles: profiles, loading: loading, onRefreshProfiles: fetchProfiles }), _jsx(TempPasswordDialog, { open: showTempPasswordDialog, onClose: () => setShowTempPasswordDialog(false), result: createdUserResult }), _jsx(ChangePasswordModal, { open: isPasswordModalOpen, onClose: () => setIsPasswordModalOpen(false), onPasswordChanged: () => {
                    // Refresh user profile after password change
                    window.location.reload();
                } })] }));
};
