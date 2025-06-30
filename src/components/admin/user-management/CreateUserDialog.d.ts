interface TempPasswordResult {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    tempPassword: string;
}
interface CreateUserDialogProps {
    onUserCreated: (result: TempPasswordResult) => void;
    onRefreshProfiles: () => void;
}
export declare const CreateUserDialog: ({ onUserCreated, onRefreshProfiles }: CreateUserDialogProps) => import("react/jsx-runtime").JSX.Element;
export {};
