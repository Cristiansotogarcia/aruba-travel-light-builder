
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Key, Clock } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  role: 'SuperUser' | 'Admin' | 'Booker' | 'Driver';
  created_at: string;
  needs_password_change?: boolean;
  email?: string;
}

interface UserListProps {
  profiles: Profile[];
  loading: boolean;
}

export const UserList = ({ profiles, loading }: UserListProps) => {
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
  );
};
