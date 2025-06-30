import type { Profile } from '@/types/types';
interface UserListProps {
    profiles: Profile[];
    loading: boolean;
    onRefreshProfiles: () => void;
}
export declare const UserList: ({ profiles, loading, onRefreshProfiles }: UserListProps) => import("react/jsx-runtime").JSX.Element;
export {};
