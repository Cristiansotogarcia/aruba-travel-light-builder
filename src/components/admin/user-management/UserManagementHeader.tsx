
import { CreateUserDialog } from './CreateUserDialog';

interface TempPasswordResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tempPassword: string;
}

interface UserManagementHeaderProps {
  onUserCreated: (result: TempPasswordResult) => void;
  onRefreshProfiles: () => void;
}

export const UserManagementHeader = ({ onUserCreated, onRefreshProfiles }: UserManagementHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
      </div>
      <CreateUserDialog 
        onUserCreated={onUserCreated}
        onRefreshProfiles={onRefreshProfiles}
      />
    </div>
  );
};
