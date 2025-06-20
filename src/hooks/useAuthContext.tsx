import { createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types/types';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null; // Added session to the context type
  loading: boolean;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>; //Added signup
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>; // Added signIn
  signOut: () => Promise<void>;
  hasPermission: (componentName: string) => boolean; // Added hasPermission
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};