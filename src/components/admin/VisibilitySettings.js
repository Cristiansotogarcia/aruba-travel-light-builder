import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
const components = [
    'UserManagement',
    'VisibilitySettings',
    'ProductManagement',
    'BookingManagement',
    'BookingAssignment',
    'DriverTasks',
    'TaskMaster'
];
const roles = ['SuperUser', 'Admin', 'Booker', 'Driver'];
export const VisibilitySettings = () => {
    const [visibilitySettings, setVisibilitySettings] = useState([]);
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
            if (error)
                throw error;
            setVisibilitySettings(data || []);
        }
        catch (error) {
            console.error('Error fetching visibility settings:', error);
            toast({
                title: "Error",
                description: "Failed to load visibility settings",
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleVisibilityChange = (componentName, role, isVisible) => {
        setVisibilitySettings(prev => prev.map(setting => setting.component_name === componentName && setting.role === role
            ? { ...setting, is_visible: isVisible }
            : setting));
    };
    const saveSettings = async () => {
        setSaving(true);
        try {
            for (const setting of visibilitySettings) {
                const { error } = await supabase
                    .from('component_visibility')
                    .update({ is_visible: setting.is_visible })
                    .eq('id', setting.id);
                if (error)
                    throw error;
            }
            toast({
                title: "Success",
                description: "Visibility settings saved successfully",
            });
        }
        catch (error) {
            console.error('Error saving settings:', error);
            toast({
                title: "Error",
                description: "Failed to save visibility settings",
                variant: "destructive",
            });
        }
        finally {
            setSaving(false);
        }
    };
    if (!hasPermission('VisibilitySettings')) {
        return (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500", children: "You don't have permission to access visibility settings." }) }));
    }
    if (loading) {
        return (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-8 bg-gray-200 rounded w-1/3 mb-4" }), _jsx("div", { className: "h-64 bg-gray-200 rounded" })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Visibility Settings" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Control which components are visible to each user role" })] }), _jsx(Button, { onClick: saveSettings, disabled: saving, children: saving ? 'Saving...' : 'Save Changes' })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Component Visibility Matrix" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b", children: [_jsx("th", { className: "text-left p-4 font-medium", children: "Component" }), roles.map(role => (_jsx("th", { className: "text-center p-4 font-medium", children: role }, role)))] }) }), _jsx("tbody", { children: components.map(component => (_jsxs("tr", { className: "border-b", children: [_jsx("td", { className: "p-4 font-medium", children: component }), roles.map(role => {
                                                        const setting = visibilitySettings.find(s => s.component_name === component && s.role === role);
                                                        return (_jsx("td", { className: "p-4 text-center", children: _jsx(Switch, { checked: setting?.is_visible || false, onCheckedChange: (checked) => handleVisibilityChange(component, role, checked), disabled: role === 'SuperUser' }) }, role));
                                                    })] }, component))) })] }) }), _jsx("div", { className: "mt-4 text-sm text-gray-500", children: _jsx("p", { children: "Note: SuperUser role always has access to all components and cannot be modified." }) })] })] })] }));
};
