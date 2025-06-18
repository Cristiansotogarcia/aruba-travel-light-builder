
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ComponentVisibility {
  id: string;
  component_name: string;
  role: 'SuperUser' | 'Admin' | 'Booker' | 'Driver';
  is_visible: boolean;
}

const components = [
  'UserManagement',
  'VisibilitySettings',
  'ProductManagement',
  'BookingManagement',
  'BookingAssignment',
  'DriverTasks',
  'TaskMaster'
];

const roles = ['SuperUser', 'Admin', 'Booker', 'Driver'] as const;

export const VisibilitySettings = () => {
  const [visibilitySettings, setVisibilitySettings] = useState<ComponentVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (hasPermission('VisibilitySettings')) {
      fetchVisibilitySettings();
    }
  }, [hasPermission]);

  const fetchVisibilitySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('component_visibility')
        .select('*')
        .order('component_name');

      if (error) throw error;
      setVisibilitySettings(data || []);
    } catch (error) {
      console.error('Error fetching visibility settings:', error);
      toast({
        title: "Error",
        description: "Failed to load visibility settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityChange = (componentName: string, role: string, isVisible: boolean) => {
    setVisibilitySettings(prev => 
      prev.map(setting => 
        setting.component_name === componentName && setting.role === role
          ? { ...setting, is_visible: isVisible }
          : setting
      )
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const setting of visibilitySettings) {
        const { error } = await supabase
          .from('component_visibility')
          .update({ is_visible: setting.is_visible })
          .eq('id', setting.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Visibility settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save visibility settings",
        variant: "destructive",
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
          <p className="text-gray-600 mt-1">Control which components are visible to each user role</p>
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
                  <th className="text-left p-4 font-medium">Component</th>
                  {roles.map(role => (
                    <th key={role} className="text-center p-4 font-medium">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {components.map(component => (
                  <tr key={component} className="border-b">
                    <td className="p-4 font-medium">{component}</td>
                    {roles.map(role => {
                      const setting = visibilitySettings.find(
                        s => s.component_name === component && s.role === role
                      );
                      return (
                        <td key={role} className="p-4 text-center">
                          <Switch
                            checked={setting?.is_visible || false}
                            onCheckedChange={(checked) => 
                              handleVisibilityChange(component, role, checked)
                            }
                            disabled={role === 'SuperUser'} // SuperUser always has access
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
            <p>Note: SuperUser role always has access to all components and cannot be modified.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
