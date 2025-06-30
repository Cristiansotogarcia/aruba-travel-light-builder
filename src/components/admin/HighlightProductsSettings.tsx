import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  featured: boolean;
}

export const HighlightProductsSettings = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('id,name,image_url,featured')
        .order('name');
      if (!error && data) {
        setProducts(data as Product[]);
        setSelected(data.filter((p) => p.featured).map((p) => p.id));
      }
    };
    load();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= 3) {
        toast({
          title: 'Limit reached',
          description: 'You can only select up to 3 products',
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await supabase.from('equipment').update({ featured: false }).eq('featured', true);
      if (selected.length > 0) {
        await supabase.from('equipment').update({ featured: true }).in('id', selected);
      }
      toast({ title: 'Success', description: 'Highlights updated' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save highlights', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage Highlight Products</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Select up to 3 products to display under "Popular Equipment" on the home page.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <label
              key={product.id}
              className={`flex items-center gap-2 border rounded p-2 cursor-pointer ${selected.includes(product.id) ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              <Checkbox
                checked={selected.includes(product.id)}
                onCheckedChange={() => toggle(product.id)}
              />
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded"
                />
              )}
              <span className="font-medium">{product.name}</span>
            </label>
          ))}
        </div>
        <Button onClick={save} disabled={saving} className="mt-4">
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HighlightProductsSettings;
