
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Edit, Trash2, Key, Copy, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordModal } from './ChangePasswordModal';

interface Profile {
  id: string;
  name: string;
  role: 'SuperUser' | 'Admin' | 'Booker' | 'Driver';
  created_at: string;
  needs_password_change?: boolean;
  email?: string;
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Driver' as const });
  const [createdUserResult, setCreatedUserResult] = useState<TempPasswordResult | null>(null);
  const [showTempPasswordDialog, setShowTempPasswordDialog] = useState(false);
  const [creating, setCreating] = useState(false);
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

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
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
          role: newUser.role
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to create user');
      }

      setCreatedUserResult(data);
      setShowTempPasswordDialog(true);
      setIsCreateDialogOpen(false);
      setNewUser({ name: '', email: '', role: 'Driver' });
      
      // Refresh profiles list
      await fetchProfiles();

      toast({
        title: "User Created Successfully",
        description: `User ${data.user.name} has been created with a temporary password.`,
      });

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyTempPassword = () => {
    if (createdUserResult?.tempPassword) {
      navigator.clipboard.writeText(createdUserResult.tempPassword);
      toast({
        title: "Copied",
        description: "Temporary password copied to clipboard",
      });
    }
  };

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

  if (!hasPermission('UserManagement')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to access user management.</p>
      </div>
    );
  }

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter user name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Driver">Driver</SelectItem>
                    <SelectItem value="Booker">Booker</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="SuperUser">SuperUser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateUser} className="w-full" disabled={creating}>
                {creating ? 'Creating User...' : 'Create User'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                        <p className="font-medium text-gray-900">{profile.name}</p>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(profile.created_at).toLocaleDateString()}
                        </p>
                        {profile.needs_password_change && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-orange-500" />
                            <span className="text-xs text-orange-600">Needs password change</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getRoleBadgeColor(profile.role)}>
                      {profile.role}
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
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

      {/* Temporary Password Display Dialog */}
      <Dialog open={showTempPasswordDialog} onOpenChange={setShowTempPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 mb-2">
                User <strong>{createdUserResult?.user.name}</strong> has been created successfully.
              </p>
              <p className="text-sm text-green-700">
                Please share the following temporary password with the user. It will expire in 48 hours.
              </p>
            </div>
            
            <div className="bg-gray-50 border rounded-lg p-4">
              <Label className="text-sm font-medium text-gray-700">Temporary Password (OTP)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={createdUserResult?.tempPassword || ''}
                  readOnly
                  className="font-mono text-lg"
                />
                <Button variant="outline" size="sm" onClick={copyTempPassword}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Important:</strong> The user must change this temporary password on their first login. 
                The temporary password will expire in 48 hours.
              </p>
            </div>

            <Button onClick={() => setShowTempPasswordDialog(false)} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
