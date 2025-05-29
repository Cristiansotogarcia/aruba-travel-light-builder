
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['app_role'];
type User = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check for existing session on mount
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // For now, we'll implement a simple session check
      // In a real app, you'd want proper JWT token handling
      const storedUser = localStorage.getItem('tla_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        await loadPermissions(userData.role);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async (role: UserRole) => {
    try {
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
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Simple authentication - in production, use proper password hashing
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Store user session
      localStorage.setItem('tla_user', JSON.stringify(data));
      setUser(data);
      await loadPermissions(data.role);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    localStorage.removeItem('tla_user');
    setUser(null);
    setPermissions({});
  };

  const hasPermission = (componentName: string): boolean => {
    if (!user) return false;
    if (user.role === 'SuperUser') return true;
    return permissions[componentName] || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
