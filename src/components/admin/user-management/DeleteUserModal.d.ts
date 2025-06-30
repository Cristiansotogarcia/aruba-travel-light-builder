import type { Profile } from '@/types/types';
interface DeleteUserModalProps {
    open: boolean;
    onClose: () => void;
    user: Profile | null;
    onUserDeleted: () => void;
}
export declare const DeleteUserModal: ({ open, onClose, user, onUserDeleted }: DeleteUserModalProps) => import("react/jsx-runtime").JSX.Element;
export {};
