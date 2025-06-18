
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['app_role'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; profile?: Profile | null }>; // Modified to return profile
  signOut: () => Promise<void>;
  hasPermission: (componentName: string) => boolean;
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadUserProfile(currentUser.id); // loadUserProfile will handle setLoading
        } else {
          setProfile(null);
          setPermissions({});
          setLoading(false); // No user, so loading is done
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      const initialUser = session?.user ?? null;
      setUser(initialUser);

      if (initialUser) {
        await loadUserProfile(initialUser.id); // loadUserProfile will handle setLoading
      } else {
        setLoading(false); // No initial user, so loading is done
      }
    }).catch(error => {
      console.error("Error getting initial session:", error);
      setLoading(false); // Ensure loading is false on error
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    setLoading(true); // Always set loading to true when starting to load a profile
    try {
      console.log('Loading profile for user:', userId);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(); // Changed to single() as profile should exist for a logged-in user

      if (error) {
        console.error('Error loading profile:', error);
        setProfile(null); // Clear profile on error
        setPermissions({});
        // Do not set loading to false here if it's an error during an update, 
        // let the main flow handle it or rely on INITIAL_SESSION completion.
        return;
      }

      if (profileData) {
        console.log('Profile loaded:', profileData);
        setProfile(profileData);
        await loadPermissions(profileData.role as UserRole); // Ensure role is cast if necessary
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
      // Set loading to false only after profile and permissions are attempted
      setLoading(false);
    }
  };

  const loadPermissions = async (role: UserRole) => {
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
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole = 'Booker'): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Attempting signup for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (error) {
        console.error('Signin error:', error);
        setLoading(false); // Set loading false if auth fails immediately
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('Auth Signup successful for user:', data.user.email, 'Now creating profile.');
        // After successful auth sign-up, create a profile for the user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id, // Supabase user ID
            email: data.user.email,
            name: name,
            role: role, // Assign the provided role, defaults to 'Booker'
            // Add other default profile fields if necessary
          });

        if (profileError) {
          console.error('Error creating profile after signup:', profileError);
          // Optionally, you might want to delete the auth user if profile creation fails
          // await supabase.auth.admin.deleteUser(data.user.id); // Requires admin privileges
          return { success: false, error: `User signed up, but profile creation failed: ${profileError.message}` };
        }

        console.log('Profile created successfully for user:', data.user.email);
        // The onAuthStateChange listener should pick up the new user and load the profile subsequently.
        return { success: true };
      }

      return { success: false, error: 'Signup failed' };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Signup failed' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true); // Set loading true at the very start of the sign-in attempt
    try {
      console.log('Attempting signin for:', email);
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error('Signin error:', signInError);
        return { success: false, error: signInError.message };
      }

      if (signInData.user) {
        console.log('Auth Signin successful for user:', signInData.user.email);
        // onAuthStateChange will be triggered. It calls loadUserProfile, which manages
        // setting profile and eventually sets loading to false.
        // So, we don't set loading to false here.
        return { success: true };
      }
      
      return { success: false, error: 'Unknown error occurred during sign-in.' };
    } catch (error) {
      console.error('Unexpected error during sign-in:', error);
      return { success: false, error: 'Unexpected error occurred during sign-in.' };
    } finally {
      setLoading(false); // Ensure loading is set to false in case of unexpected errors
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
      hasPermission 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
