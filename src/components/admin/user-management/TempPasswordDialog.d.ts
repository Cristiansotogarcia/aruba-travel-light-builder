interface TempPasswordResult {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    tempPassword: string;
}
interface TempPasswordDialogProps {
    open: boolean;
    onClose: () => void;
    result: TempPasswordResult | null;
}
export declare const TempPasswordDialog: ({ open, onClose, result }: TempPasswordDialogProps) => import("react/jsx-runtime").JSX.Element;
export {};
