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
export declare const UserManagementHeader: ({ onUserCreated, onRefreshProfiles }: UserManagementHeaderProps) => import("react/jsx-runtime").JSX.Element;
export {};
