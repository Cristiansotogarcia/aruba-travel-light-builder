
import { useEffect, useState, ReactNode, useCallback, useContext, createContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types/types';
import { useInactivityLogout } from './useInactivityLogout';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  hasPermission: (componentName: string) => boolean;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});


  const loadPermissions = useCallback(async (role: UserRole) => {
    try {
      console.log('Loading permissions for role:', role);
      const { data, error } = await supabase
        .from('component_visibility')
        .select('component_name, is_visible')
        .eq('role', role);

      if (error) throw error;

      const permissionsMap: Record<string, boolean> = {};
      data?.forEach(({ component_name, is_visible }) => {
        permissionsMap[component_name] = is_visible;
      });
      setPermissions(permissionsMap);
      console.log('Permissions loaded:', permissionsMap);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  }, []);

  const loadUserProfile = useCallback(async (userId: string) => {
    console.log('Attempting to load profile for user:', userId);
    setLoading(true);
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile inside loadUserProfile:', error);
        setProfile(null);
        setPermissions({});
        return;
      }

      if (profileData) {
        console.log('Profile data loaded successfully:', profileData);
        setProfile(profileData);
        await loadPermissions(profileData.role as UserRole);
      } else {
        console.log('No profile data found for user:', userId);
        setProfile(null);
        setPermissions({});
      }
    } catch (error) {
      console.error('Caught exception in loadUserProfile:', error);
      setProfile(null);
      setPermissions({});
    } finally {
      console.log('Finished loading profile, setting loading to false.');
      setLoading(false);
    }
  }, [loadPermissions]);

  const signOut = useCallback(async () => {
    try {
      console.log('Signing out');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      setPermissions({});
    } catch (error) {
      console.error('Signout error:', error);
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab is visible, re-validating session...');
        setLoading(true);
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Error re-validating session:', error);
            // Handle error, maybe sign out the user
            await signOut();
            return;
          }
          
          if (data.session) {
            console.log('Session re-validated successfully.');
            setSession(data.session);
            setUser(data.session.user);
            if (data.session.user) {
              await loadUserProfile(data.session.user.id);
            }
          } else {
            console.log('No active session found on re-validation.');
            await signOut();
          }
        } catch (error) {
          console.error('Exception during session re-validation:', error);
          await signOut();
        } finally {
          setLoading(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial session load
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('onAuthStateChange triggered', { _event, session });
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (_event !== 'SIGNED_IN') { // Avoid duplicate profile load on sign-in
          loadUserProfile(session.user.id);
        }
      } else {
        setProfile(null);
        setPermissions({});
      }
    });

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadUserProfile]);

  const signUp = async (email: string, password: string, name: string, role: UserRole = 'Booker'): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Attempting signup for:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: role
          }
        }
      });

      if (error) {
        console.error('Signin error:', error);
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('Auth Signup successful for user:', data.user.email, 'Now creating profile.');

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: name,
            role: role,
          });

        if (profileError) {
          console.error('Error creating profile after signup:', profileError);
          return { success: false, error: `User signed up, but profile creation failed: ${profileError.message}` };
        }

        console.log('Profile created successfully for user:', data.user.email);
        return { success: true };
      }

      return { success: false, error: 'Signup failed' };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Signup failed' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };



  useInactivityLogout({ isActive: !!user, onInactive: signOut });

  const hasPermission = (componentName: string): boolean => {
    if (!profile) return false;
    if (profile.role === 'SuperUser') return true;
    return permissions[componentName] || false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      hasPermission,
      setProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
