import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
export const HighlightProductsSettings = () => {
    const [products, setProducts] = useState([]);
    const [selected, setSelected] = useState([]);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from('equipment')
                .select('id,name,image_url,featured')
                .order('name');
            if (!error && data) {
                setProducts(data);
                setSelected(data.filter((p) => p.featured).map((p) => p.id));
            }
        };
        load();
    }, []);
    const toggle = (id) => {
        setSelected((prev) => {
            if (prev.includes(id)) {
                return prev.filter((p) => p !== id);
            }
            if (prev.length >= 6) {
                toast({
                    title: 'Limit reached',
                    description: 'You can only select up to 6 products',
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
        }
        catch (err) {
            toast({ title: 'Error', description: 'Failed to save highlights', variant: 'destructive' });
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Homepage Highlight Products" }) }), _jsxs(CardContent, { children: [_jsx("p", { className: "text-sm text-gray-500 mb-4", children: "Select up to 6 products to display under \"Popular Equipment\" on the home page." }), _jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4", children: products.map((product) => (_jsxs("label", { className: `flex items-center gap-2 border rounded p-2 cursor-pointer ${selected.includes(product.id) ? 'bg-blue-50 border-blue-300' : ''}`, children: [_jsx(Checkbox, { checked: selected.includes(product.id), onCheckedChange: () => toggle(product.id) }), product.image_url && (_jsx("img", { src: product.image_url, alt: product.name, className: "w-12 h-12 object-cover rounded" })), _jsx("span", { className: "font-medium", children: product.name })] }, product.id))) }), _jsx(Button, { onClick: save, disabled: saving, className: "mt-4", children: saving ? 'Saving...' : 'Save' })] })] }));
};
export default HighlightProductsSettings;
