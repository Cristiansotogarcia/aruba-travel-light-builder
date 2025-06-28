
import { useEffect, useState, ReactNode, useCallback, useContext, createContext, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types/types';

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
  const initialAuthEventHandled = useRef(false);
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

  const loadUserProfile = useCallback(async (userId: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      console.log('Loading profile for user:', userId, 'Show Loading:', showLoading);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
        setPermissions({});
        return;
      }

      if (profileData) {
        console.log('Profile loaded:', profileData);
        setProfile(profileData);
        await loadPermissions(profileData.role as UserRole);
      } else {
        console.log('No profile found for user, they may need to complete registration or an error occurred.');
        setProfile(null);
        setPermissions({});
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [loadPermissions]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Show loading indicator on initial session load or sign-in, but only once.
          const isInitialEvent = (event === 'INITIAL_SESSION' || event === 'SIGNED_IN');
          const showLoading = isInitialEvent && !initialAuthEventHandled.current;
          await loadUserProfile(currentUser.id, showLoading);
          if (isInitialEvent) {
            initialAuthEventHandled.current = true;
          }
        } else {
          setProfile(null);
          setPermissions({});
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
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
      console.log('Attempting signin for:', email);
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error('Signin error:', signInError);
        setLoading(false);
        return { success: false, error: signInError.message };
      }

      if (signInData.user) {
        console.log('Auth Signin successful for user:', signInData.user.email);
        return { success: true };
      }
      
      setLoading(false);
      return { success: false, error: 'Unknown error occurred during sign-in.' };
    } catch (error) {
      console.error('Unexpected error during sign-in:', error);
      setLoading(false);
      return { success: false, error: 'Unexpected error occurred during sign-in.' };
    }
  };

  const signOut = async () => {
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
  };

  // Automatically sign the user out after 5 minutes of inactivity
  useEffect(() => {
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (user) {
        inactivityTimer = setTimeout(() => {
          console.log('User inactive for 5 minutes. Signing out.');
          signOut();
        }, INACTIVITY_LIMIT);
      }
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];

    activityEvents.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      activityEvents.forEach(event =>
        window.removeEventListener(event, resetTimer)
      );
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [user]);

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
