import type { Profile } from '@/types/types';
interface ResetPasswordModalProps {
    open: boolean;
    onClose: () => void;
    user: Profile | null;
    onPasswordReset: () => void;
}
export declare const ResetPasswordModal: ({ open, onClose, user, onPasswordReset }: ResetPasswordModalProps) => import("react/jsx-runtime").JSX.Element;
export {};
