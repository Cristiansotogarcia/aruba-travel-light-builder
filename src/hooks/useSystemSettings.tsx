import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, setting_type, description')
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const settingsMap: Record<string, string> = {};
      data?.forEach((setting) => {
        settingsMap[setting.setting_key] = setting.setting_value || '';
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (
    key: string,
    value: string,
    type: string = 'string',
    description?: string
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('system_settings')
        .upsert(
          {
            setting_key: key,
            setting_value: value,
            setting_type: type,
            description: description || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'setting_key' }
        );

      if (updateError) throw updateError;

      // Update local state
      setSettings((prev) => ({ ...prev, [key]: value }));
      return { success: true };
    } catch (err) {
      console.error('Error updating setting:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update setting' };
    }
  };

  // Helper to get a specific setting with type conversion
  const getSetting = useCallback(
    (key: string, defaultValue: string = ''): string => {
      return settings[key] ?? defaultValue;
    },
    [settings]
  );

  // Helper to get numeric setting
  const getNumericSetting = useCallback(
    (key: string, defaultValue: number = 0): number => {
      const value = settings[key];
      if (!value) return defaultValue;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    },
    [settings]
  );

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSetting,
    getSetting,
    getNumericSetting,
  };
}