import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubCategory {
  id: string;
  name: string;
  sort_order: number | null;
  equipment_category: {
    id: string;
    name: string;
    sort_order: number | null;
  } | null;
}

export const SubGroupOrderSettings = () => {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
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
        setSubCategories(data as SubCategory[]);
      } else {
        toast({ title: 'Error', description: 'Failed to load subgroups', variant: 'destructive' });
      }
      setLoading(false);
    };
    load();
  }, [toast]);

  const grouped = useMemo(() => {
    const map: Record<string, { sort_order: number; items: SubCategory[] }> = {};
    subCategories.forEach(sc => {
      const catName = sc.equipment_category?.name || 'Uncategorized';
      const catOrder = sc.equipment_category?.sort_order ?? 0;
      if (!map[catName]) {
        map[catName] = { sort_order: catOrder, items: [] };
      }
      map[catName].items.push(sc);
    });
    const sortedCats = Object.entries(map).sort((a, b) => a[1].sort_order - b[1].sort_order);
    const result: [string, SubCategory[]][] = sortedCats.map(([name, data]) => {
      const sortedSubs = data.items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return [name, sortedSubs];
    });
    return result;
  }, [subCategories]);

  const handleChange = (id: string, value: number) => {
    const sanitized = Math.max(0, value);
    setSubCategories(prev => prev.map(sc => sc.id === id ? { ...sc, sort_order: sanitized } : sc));
  };

  const save = async () => {
    setSaving(true);
    try {
      const results = await Promise.all(
        subCategories.map(sc =>
          supabase
            .from('equipment_sub_category')
            .update({ sort_order: sc.sort_order ?? 0 })
            .eq('id', sc.id)
        )
      );

      const firstError = results.find(r => r.error)?.error;
      if (firstError) {
        toast({ title: 'Error', description: 'Failed to save order', variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: 'Subgroup order updated' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save order', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-4">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subgroup Display Order</CardTitle>
      </CardHeader>
      <CardContent>
        {grouped.map(([catName, subs]) => (
          <div key={catName} className="mb-6">
            <h4 className="font-semibold mb-2">{catName}</h4>
            {subs.map(sc => (
              <div key={sc.id} className="flex items-center gap-2 mb-2">
                <span className="flex-1">{sc.name}</span>
                <Input
                  type="number"
                  min={0}
                  value={sc.sort_order ?? 0}
                  onChange={e => handleChange(sc.id, Number(e.target.value))}
                  className="w-24"
                />
              </div>
            ))}
          </div>
        ))}
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Order'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubGroupOrderSettings;