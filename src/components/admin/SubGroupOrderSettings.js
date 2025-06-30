import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
export const SubGroupOrderSettings = () => {
    const [subCategories, setSubCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from('equipment_sub_category')
                .select('id,name,sort_order,equipment_category(id,name,sort_order)')
                .order('sort_order', { ascending: true, nullsFirst: false });
            if (!error && data) {
                setSubCategories(data);
            }
            else {
                toast({ title: 'Error', description: 'Failed to load subgroups', variant: 'destructive' });
            }
            setLoading(false);
        };
        load();
    }, [toast]);
    const grouped = useMemo(() => {
        const map = {};
        subCategories.forEach(sc => {
            const catName = sc.equipment_category?.name || 'Uncategorized';
            const catOrder = sc.equipment_category?.sort_order ?? 0;
            if (!map[catName]) {
                map[catName] = { sort_order: catOrder, items: [] };
            }
            map[catName].items.push(sc);
        });
        const sortedCats = Object.entries(map).sort((a, b) => a[1].sort_order - b[1].sort_order);
        const result = sortedCats.map(([name, data]) => {
            const sortedSubs = data.items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            return [name, sortedSubs];
        });
        return result;
    }, [subCategories]);
    const handleChange = (id, value) => {
        setSubCategories(prev => prev.map(sc => sc.id === id ? { ...sc, sort_order: value } : sc));
    };
    const save = async () => {
        setSaving(true);
        try {
            await Promise.all(subCategories.map(sc => supabase.from('equipment_sub_category').update({ sort_order: sc.sort_order ?? 0 }).eq('id', sc.id)));
            toast({ title: 'Success', description: 'Subgroup order updated' });
        }
        catch (err) {
            toast({ title: 'Error', description: 'Failed to save order', variant: 'destructive' });
        }
        finally {
            setSaving(false);
        }
    };
    if (loading) {
        return _jsx("div", { className: "py-4", children: "Loading..." });
    }
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Subgroup Display Order" }) }), _jsxs(CardContent, { children: [grouped.map(([catName, subs]) => (_jsxs("div", { className: "mb-6", children: [_jsx("h4", { className: "font-semibold mb-2", children: catName }), subs.map(sc => (_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "flex-1", children: sc.name }), _jsx(Input, { type: "number", value: sc.sort_order ?? 0, onChange: e => handleChange(sc.id, Number(e.target.value)), className: "w-24" })] }, sc.id)))] }, catName))), _jsx(Button, { onClick: save, disabled: saving, children: saving ? 'Saving...' : 'Save Order' })] })] }));
};
export default SubGroupOrderSettings;
