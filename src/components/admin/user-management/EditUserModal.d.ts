import type { Profile } from '@/types/types';
interface EditUserModalProps {
    open: boolean;
    onClose: () => void;
    user: Profile | null;
    onUserUpdated: () => void;
}
export declare const EditUserModal: ({ open, onClose, user, onUserUpdated }: EditUserModalProps) => import("react/jsx-runtime").JSX.Element;
export {};
