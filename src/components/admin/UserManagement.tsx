
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordModal } from './ChangePasswordModal';
import { UserManagementHeader } from './user-management/UserManagementHeader';
import { UserList } from './user-management/UserList';
import { TempPasswordDialog } from './user-management/TempPasswordDialog';

interface Profile {
  id: string;
  name: string;
  role: 'SuperUser' | 'Admin' | 'Booker' | 'Driver';
  created_at: string;
  needs_password_change?: boolean;
  email?: string;
  is_deactivated?: boolean;
}

interface TempPasswordResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tempPassword: string;
}

export const UserManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [createdUserResult, setCreatedUserResult] = useState<TempPasswordResult | null>(null);
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

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load user profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = (result: TempPasswordResult) => {
    setCreatedUserResult(result);
    setShowTempPasswordDialog(true);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
  
    if (!error) {
      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole as User['role'] } : user
      ));
    } else {
      console.error('Role update failed:', error);
      alert('Failed to update role: ' + error.message);
    }
  };

  if (!hasPermission('UserManagement')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to access user management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserManagementHeader 
        onUserCreated={handleUserCreated}
        onRefreshProfiles={fetchProfiles}
      />

      <UserList 
        profiles={profiles} 
        loading={loading} 
        onRefreshProfiles={fetchProfiles}
      />

      {/* Temporary Password Display Dialog */}
      <TempPasswordDialog
        open={showTempPasswordDialog}
        onClose={() => setShowTempPasswordDialog(false)}
        result={createdUserResult}
      />

      {/* Password Change Modal for current user */}
      <ChangePasswordModal
        open={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onPasswordChanged={() => {
          // Refresh user profile after password change
          window.location.reload();
        }}
      />
    </div>
  );
};

<SelectItem value="admin">Admin</SelectItem>
<SelectItem value="driver">Driver</SelectItem>
<SelectItem value="booking">Booking Manager</SelectItem>
<SelectItem value="driver_booking">Driver + Booking</SelectItem>