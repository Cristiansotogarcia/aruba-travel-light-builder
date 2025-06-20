import { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
// 1. IMPORT UserRole from '@/types/types'
import type { Profile, UserRole } from '@/types/types'; // <--- ADD UserRole here

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  // 2. CHANGE 'string' to 'UserRole' for the role parameter in signUp
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>; // <--- CHANGE THIS LINE (line 11)
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (componentName: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};