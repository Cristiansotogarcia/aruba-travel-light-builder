
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card imports
import { Badge } from '@/components/ui/badge'; // Added Badge import
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, KeyRound, RefreshCcw, Eye, EyeOff, UserCheck, UserX } from 'lucide-react';
import { EditUserModal } from './EditUserModal';
import { DeleteUserModal } from './DeleteUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import type { Profile } from '@/types/types';

interface UserListProps {
  profiles: Profile[];
  loading: boolean;
  onRefreshProfiles: () => void;
}

export const UserList = ({ profiles, loading, onRefreshProfiles }: UserListProps) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const getRoleBadgeColor = (role: string) => {
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

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleResetPassword = (user: Profile) => {
    setSelectedUser(user);
    setResetPasswordModalOpen(true);
  };

  const handleDeleteUser = (user: Profile) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Users ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.length > 0 ? (
              profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{profile.name}</p>
                          {profile.is_deactivated && (
                            <Badge variant="destructive" className="text-xs">
                              <UserX className="h-3 w-3 mr-1" />
                              Deactivated
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {profile.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          Created: {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getRoleBadgeColor(profile.role)}>
                      {profile.role}
                    </Badge>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditUser(profile)}
                        title="Edit user"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleResetPassword(profile)}
                        title="Reset password"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteUser(profile)}
                        title="Delete/Deactivate user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No users found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <EditUserModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={selectedUser}
        onUserUpdated={onRefreshProfiles}
      />

      <ResetPasswordModal
        open={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        user={selectedUser}
        onPasswordReset={onRefreshProfiles}
      />

      <DeleteUserModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        user={selectedUser}
        onUserDeleted={onRefreshProfiles}
      />
    </>
  );
};
