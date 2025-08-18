import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface Product {
  id: string;
  name: string;
  images: string[] | null;
  featured: boolean;
  sort_order?: number | null;
  featured_sort_order?: number | null;
}

export const HighlightProductsSettings = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [orderedProducts, setOrderedProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('id,name,images,featured,featured_sort_order')
        .order('featured_sort_order', { ascending: true })
        .order('name');
      if (!error && data) {
        setProducts(data as Product[]);
        const featuredProducts = data.filter((p) => p.featured);
        setSelected(featuredProducts.map((p) => p.id));
        setOrderedProducts(featuredProducts.sort((a, b) => {
          // Sort by featured_sort_order first, then by name if featured_sort_order is the same
          if ((a.featured_sort_order ?? 999) === (b.featured_sort_order ?? 999)) {
            return a.name.localeCompare(b.name);
          }
          return (a.featured_sort_order || 999) - (b.featured_sort_order || 999);
        }));
      }
    };
    load();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        // Remove from selected
        const newSelected = prev.filter((p) => p !== id);
        // Also remove from ordered products
        setOrderedProducts(orderedProducts.filter((p) => p.id !== id));
        return newSelected;
      }
      if (prev.length >= 6) {
        toast({
          title: 'Limit reached',
          description: 'You can only select up to 6 products',
          variant: 'destructive',
        });
        return prev;
      }
      // Add to selected and ordered products
      const productToAdd = products.find((p) => p.id === id);
      if (productToAdd) {
        setOrderedProducts([...orderedProducts, productToAdd]);
      }
      return [...prev, id];
    });
  };

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= orderedProducts.length) return;
    
    const newOrderedProducts = [...orderedProducts];
    [newOrderedProducts[index], newOrderedProducts[newIndex]] = 
      [newOrderedProducts[newIndex], newOrderedProducts[index]];
    
    // Update featured_sort_order values
    setOrderedProducts(newOrderedProducts.map((product, idx) => ({
      ...product,
      featured_sort_order: idx + 1 // Start from 1 for better readability
    })));
  };

  // In the save function, update to use featured_sort_order instead of sort_order
  const save = async () => {
    setSaving(true);
    try {
      // First, reset all products to not featured
      await supabase.from('equipment').update({ featured: false }).eq('featured', true);
      
      // Then update each selected product with its featured status and featured_sort_order
      for (let i = 0; i < orderedProducts.length; i++) {
        const product = orderedProducts[i];
        await supabase
          .from('equipment')
          .update({ 
            featured: true, 
            featured_sort_order: i + 1 // Start from 1 for better readability
          })
          .eq('id', product.id);
      }
      
      // Invalidate React Query cache to reflect changes
      await queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      
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
          Select up to 6 products to display under "Popular Equipment" on the home page.
          You can also reorder them to control their display order.
        </p>
        
        {/* Selected products with reordering */}
        {orderedProducts.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Selected Products (Display Order)</h3>
            <div className="space-y-2 border rounded-md p-3">
              {orderedProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                  <div className="flex items-center gap-2">
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => moveProduct(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => moveProduct(index, 'down')}
                      disabled={index === orderedProducts.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggle(product.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* All products for selection */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products
            .filter(product => !selected.includes(product.id))
            .map((product) => (
              <label
                key={product.id}
                className="flex items-center gap-2 border rounded p-2 cursor-pointer hover:bg-gray-50"
              >
                <Checkbox
                  checked={selected.includes(product.id)}
                  onCheckedChange={() => toggle(product.id)}
                />
                {product.images?.[0] && (
                  <img
                    src={product.images[0]}
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
