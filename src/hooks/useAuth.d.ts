import { ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types/types';
interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{
        success: boolean;
        error?: string;
    }>;
    signIn: (email: string, password: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    signOut: () => Promise<void>;
    hasPermission: (componentName: string) => boolean;
    setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}
export declare const useAuth: () => AuthContextType;
interface AuthProviderProps {
    children: ReactNode;
}
export declare const AuthProvider: ({ children }: AuthProviderProps) => import("react/jsx-runtime").JSX.Element;
export {};
