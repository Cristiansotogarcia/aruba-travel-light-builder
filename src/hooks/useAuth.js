import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useContext, createContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useInactivityLogout } from './useInactivityLogout';
const AuthContext = createContext(undefined);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState({});
    const loadPermissions = useCallback(async (role) => {
        try {
            console.log('Loading permissions for role:', role);
            const { data, error } = await supabase
                .from('component_visibility')
                .select('component_name, is_visible')
                .eq('role', role);
            if (error)
                throw error;
            const permissionsMap = {};
            data?.forEach(({ component_name, is_visible }) => {
                permissionsMap[component_name] = is_visible;
            });
            setPermissions(permissionsMap);
            console.log('Permissions loaded:', permissionsMap);
        }
        catch (error) {
            console.error('Error loading permissions:', error);
        }
    }, []);
    const loadUserProfile = useCallback(async (userId) => {
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
                await loadPermissions(profileData.role);
            }
            else {
                console.log('No profile data found for user:', userId);
                setProfile(null);
                setPermissions({});
            }
        }
        catch (error) {
            console.error('Caught exception in loadUserProfile:', error);
            setProfile(null);
            setPermissions({});
        }
        finally {
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
        }
        catch (error) {
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
                    }
                    else {
                        console.log('No active session found on re-validation.');
                        await signOut();
                    }
                }
                catch (error) {
                    console.error('Exception during session re-validation:', error);
                    await signOut();
                }
                finally {
                    setLoading(false);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        // Initial session load
        const getInitialSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error)
                    throw error;
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await loadUserProfile(session.user.id);
                }
                else {
                    setLoading(false);
                }
            }
            catch (error) {
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
            }
            else {
                setProfile(null);
                setPermissions({});
            }
        });
        return () => {
            subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadUserProfile]);
    const signUp = async (email, password, name, role = 'Booker') => {
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
        }
        catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: 'Signup failed' };
        }
    };
    const signIn = async (email, password) => {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
        finally {
            setLoading(false);
        }
    };
    useInactivityLogout({ isActive: !!user, onInactive: signOut });
    const hasPermission = (componentName) => {
        if (!profile)
            return false;
        if (profile.role === 'SuperUser')
            return true;
        return permissions[componentName] || false;
    };
    return (_jsx(AuthContext.Provider, { value: {
            user,
            profile,
            session,
            loading,
            signUp,
            signIn,
            signOut,
            hasPermission,
            setProfile
        }, children: children }));
};
