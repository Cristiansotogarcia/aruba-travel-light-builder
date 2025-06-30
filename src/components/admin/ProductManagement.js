import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Cloud } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BulkProductUpload } from './BulkProductUpload';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProductCard } from './ProductCard';
import { CloudflareImageUpload } from './CloudflareImageUpload';
export const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productToDelete, setProductToDelete] = useState(null);
    const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);
    const [formState, setFormState] = useState({
        name: '',
        description: '',
        category_id: '',
        sub_category_id: '',
        price_per_day: 0,
        availability_status: 'Available',
        stock_quantity: 0,
        image_url: '',
        featured: false,
        sort_order: 0,
    });
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    useEffect(() => {
        if (hasPermission('ProductManagement')) {
            fetchData();
        }
    }, [hasPermission]);
    const fetchData = async () => {
        try {
            const { data: productsData, error: productsError } = await supabase.from('equipment').select('*, equipment_category(name), equipment_sub_category(name)');
            if (productsError)
                throw productsError;
            setProducts(productsData.map(p => ({ ...p, category: p.equipment_category?.name || 'Uncategorized', sub_category: p.equipment_sub_category?.name, availability_status: (p.availability_status || 'Available') })));
            const { data: cats, error: catError } = await supabase.from('equipment_category').select('*');
            if (catError)
                throw catError;
            setCategories(cats);
            const { data: subCats, error: subCatError } = await supabase.from('equipment_sub_category').select('*');
            if (subCatError)
                throw subCatError;
            setSubCategories(subCats);
        }
        catch (error) {
            console.error('Error fetching data:', error);
            toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    };
    const handleImageUpload = (imageUrl) => {
        setFormState({ ...formState, image_url: imageUrl });
        toast({ title: "Success", description: "Image uploaded successfully" });
    };
    const handleSaveProduct = async () => {
        if (!formState.category_id) {
            toast({ title: "Error", description: "Please select a category.", variant: "destructive" });
            return;
        }
        let imageUrl = formState.image_url;
        // Image URL is set from Cloudflare selection only
        const dataToSave = {
            name: formState.name,
            description: formState.description,
            price_per_day: formState.price_per_day,
            stock_quantity: formState.stock_quantity,
            availability_status: formState.availability_status,
            featured: formState.featured,
            sort_order: formState.sort_order,
            image_url: imageUrl,
            category_id: formState.category_id,
            sub_category_id: formState.sub_category_id || null,
            updated_at: new Date().toISOString(),
        };
        let error;
        if (editingProduct) {
            ({ error } = await supabase.from('equipment').update(dataToSave).eq('id', editingProduct.id));
        }
        else {
            ({ error } = await supabase.from('equipment').insert([dataToSave]));
        }
        if (error) {
            toast({ title: "Error", description: "Failed to save product", variant: "destructive" });
        }
        else {
            toast({ title: "Success", description: "Product saved" });
            setIsEditDialogOpen(false);
            setIsCreateDialogOpen(false);
            setEditingProduct(null);
            fetchData();
        }
    };
    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setFormState({
            ...product,
            category_id: product.category_id || '',
            sub_category_id: product.sub_category_id || '',
        });
        setIsEditDialogOpen(true);
    };
    const handleDeleteProduct = async () => {
        if (!productToDelete)
            return;
        const { error } = await supabase.from('equipment').delete().eq('id', productToDelete.id);
        if (error) {
            toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
        }
        else {
            toast({ title: "Success", description: "Product deleted" });
            setProductToDelete(null);
            fetchData();
        }
    };
    const renderProductForm = (submitHandler, title, buttonText) => (_jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: title }), _jsx(DialogDescription, { children: "Fill in the form to add or edit a product." })] }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsx(Input, { placeholder: "Product Name", value: formState.name, onChange: e => setFormState({ ...formState, name: e.target.value }) }), _jsx(Textarea, { placeholder: "Description", value: formState.description, onChange: e => setFormState({ ...formState, description: e.target.value }) }), _jsxs(Select, { value: formState.category_id, onValueChange: value => setFormState({ ...formState, category_id: value, sub_category_id: '' }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select category" }) }), _jsx(SelectContent, { children: categories.map(c => _jsx(SelectItem, { value: c.id, children: c.name }, c.id)) })] }), _jsxs(Select, { value: formState.sub_category_id, onValueChange: value => setFormState({ ...formState, sub_category_id: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select sub-category" }) }), _jsx(SelectContent, { children: subCategories.filter(sc => sc.category_id === formState.category_id).map(sc => _jsx(SelectItem, { value: sc.id, children: sc.name }, sc.id)) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Price per Day" }), _jsx(Input, { type: "number", placeholder: "Price per day", value: formState.price_per_day, onChange: e => setFormState({ ...formState, price_per_day: Number(e.target.value) }) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Stock Quantity" }), _jsx(Input, { type: "number", placeholder: "Stock Quantity", value: formState.stock_quantity, onChange: e => setFormState({ ...formState, stock_quantity: Number(e.target.value) }) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Sort Order" }), _jsx(Input, { type: "number", placeholder: "Sort Order", value: formState.sort_order, onChange: e => setFormState({ ...formState, sort_order: Number(e.target.value) }) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Image" }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Button, { type: "button", variant: "outline", onClick: () => setIsImageUploadDialogOpen(true), className: "w-full", children: [_jsx(Cloud, { className: "h-4 w-4 mr-2" }), "Upload Image to Cloudflare"] }), formState.image_url && (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Selected image:" }), _jsx("img", { src: formState.image_url, alt: "Selected", className: "w-20 h-20 object-cover rounded border" })] }))] })] }), _jsx(Button, { onClick: submitHandler, className: "w-full", children: buttonText })] })] }));
    if (loading)
        return _jsx(Skeleton, { className: "h-96 w-full" });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h1", { className: "text-3xl font-bold", children: "Product Management" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { onClick: () => {
                                    setEditingProduct(null);
                                    setFormState({ name: '', description: '', category_id: '', sub_category_id: '', price_per_day: 0, availability_status: 'Available', stock_quantity: 0, image_url: '', featured: false, sort_order: 0 });
                                    setIsCreateDialogOpen(true);
                                }, children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), " Add Product"] }), _jsxs(Dialog, { open: isBulkDialogOpen, onOpenChange: setIsBulkDialogOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsx(Button, { variant: "outline", children: "Bulk Upload" }) }), _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Bulk Upload Products" }) }), _jsx(BulkProductUpload, { onComplete: () => { setIsBulkDialogOpen(false); fetchData(); } })] })] })] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: products.map(product => (_jsx(ProductCard, { product: product, onEdit: () => handleEditProduct(product), onDelete: () => setProductToDelete(product), onToggleAvailability: () => { } }, product.id))) }), _jsx(Dialog, { open: isCreateDialogOpen, onOpenChange: setIsCreateDialogOpen, children: renderProductForm(handleSaveProduct, "Create New Product", "Create Product") }), _jsx(Dialog, { open: isEditDialogOpen, onOpenChange: setIsEditDialogOpen, children: editingProduct && renderProductForm(handleSaveProduct, "Edit Product", "Save Changes") }), _jsx(AlertDialog, { open: !!productToDelete, onOpenChange: (isOpen) => !isOpen && setProductToDelete(null), children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Are you sure?" }), _jsxs(AlertDialogDescription, { children: ["This will permanently delete \"", productToDelete?.name, "\"."] })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: handleDeleteProduct, children: "Delete" })] })] }) }), _jsx(CloudflareImageUpload, { isOpen: isImageUploadDialogOpen, onClose: () => setIsImageUploadDialogOpen(false), onImageSelect: handleImageUpload, selectedImageUrl: formState.image_url })] }));
};
export default ProductManagement;
