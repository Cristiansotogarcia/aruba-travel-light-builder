import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Role = 'SuperUser' | 'Admin' | 'Booker' | 'Customer' | 'Driver';

interface ComponentVisibility {
  id?: string;
  component_name: string;
  role: Role;
  is_visible: boolean;
}

interface VisibilityComponent {
  component_name: string;
  label: string;
  defaults: Record<Role, boolean>;
}

const roles: Role[] = ['SuperUser', 'Admin', 'Booker', 'Customer', 'Driver'];

const visibilityComponents: VisibilityComponent[] = [
  {
    component_name: 'ReportingAccess',
    label: 'Analytics & Reports',
    defaults: { SuperUser: true, Admin: true, Booker: false, Customer: false, Driver: false },
  },
  {
    component_name: 'BookingManagement',
    label: 'Bookings & Customers',
    defaults: { SuperUser: true, Admin: true, Booker: true, Customer: false, Driver: false },
  },
  {
    component_name: 'BookingAssignment',
    label: 'Assignments',
    defaults: { SuperUser: true, Admin: true, Booker: true, Customer: false, Driver: false },
  },
  {
    component_name: 'ProductManagement',
    label: 'Equipment',
    defaults: { SuperUser: true, Admin: true, Booker: false, Customer: false, Driver: false },
  },
  {
    component_name: 'CategoryManagement',
    label: 'Categories & Order',
    defaults: { SuperUser: true, Admin: true, Booker: false, Customer: false, Driver: false },
  },
  {
    component_name: 'SeoManager',
    label: 'SEO Manager',
    defaults: { SuperUser: true, Admin: true, Booker: false, Customer: false, Driver: false },
  },
  {
    component_name: 'UserManagement',
    label: 'User Management',
    defaults: { SuperUser: true, Admin: true, Booker: false, Customer: false, Driver: false },
  },
  {
    component_name: 'VisibilitySettings',
    label: 'Visibility Settings',
    defaults: { SuperUser: true, Admin: true, Booker: false, Customer: false, Driver: false },
  },
  {
    component_name: 'DriverTasks',
    label: 'My Tasks',
    defaults: { SuperUser: true, Admin: true, Booker: false, Customer: false, Driver: true },
  },
  {
    component_name: 'TaskMaster',
    label: 'Task Management',
    defaults: { SuperUser: true, Admin: true, Booker: false, Customer: false, Driver: false },
  },
  {
    component_name: 'settings',
    label: 'Settings',
    defaults: { SuperUser: true, Admin: true, Booker: false, Customer: false, Driver: false },
  },
];

const buildVisibilityMatrix = (existingSettings: ComponentVisibility[]) =>
  visibilityComponents.flatMap((component) =>
    roles.map((role) => {
      const existing = existingSettings.find(
        (setting) => setting.component_name === component.component_name && setting.role === role
      );

      return (
        existing || {
          component_name: component.component_name,
          role,
          is_visible: component.defaults[role],
        }
      );
    })
  );

export const VisibilitySettings = () => {
  const [visibilitySettings, setVisibilitySettings] = useState<ComponentVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const fetchVisibilitySettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('component_visibility')
        .select('*')
        .in(
          'component_name',
          visibilityComponents.map((component) => component.component_name)
        );

      if (error) {
        throw error;
      }

      setVisibilitySettings(buildVisibilityMatrix((data || []) as ComponentVisibility[]));
    } catch (error) {
      console.error('Error fetching visibility settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load visibility settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (hasPermission('VisibilitySettings')) {
      fetchVisibilitySettings();
    }
  }, [fetchVisibilitySettings, hasPermission]);

  const handleVisibilityChange = (componentName: string, role: Role, isVisible: boolean) => {
    setVisibilitySettings((prev) =>
      prev.map((setting) =>
        setting.component_name === componentName && setting.role === role
          ? { ...setting, is_visible: role === 'SuperUser' ? true : isVisible }
          : setting
      )
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const setting of visibilitySettings) {
        const payload = {
          component_name: setting.component_name,
          role: setting.role,
          is_visible: setting.role === 'SuperUser' ? true : setting.is_visible,
        };

        if (setting.id) {
          const { error } = await supabase
            .from('component_visibility')
            .update({ is_visible: payload.is_visible })
            .eq('id', setting.id);

          if (error) {
            throw error;
          }
        } else {
          const { data, error } = await supabase
            .from('component_visibility')
            .insert(payload)
            .select('id')
            .single();

          if (error) {
            throw error;
          }

          setting.id = data.id;
        }
      }

      toast({
        title: 'Success',
        description: 'Visibility settings saved successfully',
      });
      await fetchVisibilitySettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save visibility settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('VisibilitySettings')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to access visibility settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visibility Settings</h1>
          <p className="text-gray-600 mt-1">Control which operational modules are available to each user role</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Component Visibility Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Module</th>
                  {roles.map((role) => (
                    <th key={role} className="text-center p-4 font-medium">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibilityComponents.map((component) => (
                  <tr key={component.component_name} className="border-b">
                    <td className="p-4 font-medium">{component.label}</td>
                    {roles.map((role) => {
                      const setting = visibilitySettings.find(
                        (item) => item.component_name === component.component_name && item.role === role
                      );

                      return (
                        <td key={role} className="p-4 text-center">
                          <Switch
                            checked={setting?.is_visible || false}
                            onCheckedChange={(checked) =>
                              handleVisibilityChange(component.component_name, role, checked)
                            }
                            disabled={role === 'SuperUser'}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <p>SuperUser access is always enabled. Missing permission rows are created automatically when you save.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
