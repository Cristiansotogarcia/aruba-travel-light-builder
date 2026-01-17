import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import DOMPurify from 'dompurify';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Cloud, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BulkProductUpload } from './BulkProductUpload';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProductCard } from './ProductCard';
import { CloudflareImageUpload } from './CloudflareImageUpload';
import { AdminEquipmentFilters } from './AdminEquipmentFilters';
import type { ActiveAdminFiltersState } from './AdminEquipmentFilters';
import type { Product as GlobalProduct, AvailabilityStatus } from '@/types/types';

interface Product extends GlobalProduct {
  sub_category?: string | null;
  sub_category_id?: string | null;
  sort_order?: number | null;
}

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
  category_id: string;
}

export const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveAdminFiltersState>({
    category: '',
    subcategory: '',
  });


  const [formState, setFormState] = useState<any>({
    name: '',
    description: '',
    category_id: '',
    sub_category_id: '',
    price_per_day: 0,
    availability_status: 'Available',
    stock_quantity: 0,
    images: [] as string[],
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

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const { category, subcategory } = activeFilters;
      if (category && product.category !== category) {
        return false;
      }
      if (subcategory && product.sub_category !== subcategory) {
        return false;
      }
      return true;
    });
  }, [products, activeFilters]);

  const fetchData = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase.from('equipment').select('*, equipment_category(name), equipment_sub_category(name)');
      if (productsError) throw productsError;
      setProducts(productsData.map(p => ({
        ...p,
        images: p.images || [],
        category: p.equipment_category?.name || 'Uncategorized',
        sub_category: p.equipment_sub_category?.name,
        availability_status: (p.availability_status || 'Available') as AvailabilityStatus
      })));

      const { data: cats, error: catError } = await supabase.from('equipment_category').select('*');
      if (catError) throw catError;
      setCategories(cats);

      const { data: subCats, error: subCatError } = await supabase.from('equipment_sub_category').select('*');
      if (subCatError) throw subCatError;
      setSubCategories(subCats as SubCategory[]);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setFormState({ ...formState, images: [...formState.images, imageUrl] });
    toast({ title: "Success", description: "Image uploaded successfully" });
    setIsImageUploadDialogOpen(false);
  };

  const handleRemoveImage = (url: string) => {
    setFormState({ ...formState, images: formState.images.filter((img: string) => img !== url) });
  };

  const handleSaveProduct = async () => {
    if (!formState.category_id) {
      toast({ title: "Error", description: "Please select a category.", variant: "destructive" });
      return;
    }
    const dataToSave: Record<string, any> = {
      name: formState.name,
      description: DOMPurify.sanitize(formState.description),
      price_per_day: formState.price_per_day,
      stock_quantity: formState.stock_quantity,
      availability_status: formState.availability_status,
      featured: formState.featured,
      sort_order: formState.sort_order,
      images: formState.images,
      image_url: formState.images[0] || null,
      category_id: formState.category_id,
      sub_category_id: formState.sub_category_id || null,
      updated_at: new Date().toISOString(),
    };

    const saveProduct = async (payload: Record<string, any>) => {
      if (editingProduct) {
        return supabase.from('equipment').update(payload).eq('id', editingProduct.id);
      }
      return supabase.from('equipment').insert([payload]);
    };

    let { error } = await saveProduct(dataToSave);

    // Fallbacks for different database schemas
    if (error && error.message) {
      // Handle legacy databases without images column
      if (error.message.includes('column "images"')) {
        const fallbackData = { ...dataToSave };
        delete fallbackData.images;
        ({ error } = await saveProduct(fallbackData));
      }

      // Handle databases without image_url column
      if (error && error.message.includes('column "image_url"')) {
        const fallbackData = { ...dataToSave };
        delete fallbackData.image_url;
        ({ error } = await saveProduct(fallbackData));
      }
    }

    if (error) {
      console.error('Error saving product:', error);
      toast({ title: "Error", description: "Failed to save product", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Product saved" });
      setIsEditDialogOpen(false);
      setIsCreateDialogOpen(false);
      setEditingProduct(null);
      fetchData();
    }
  };
  
  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setFormState({
      ...product,
      images: product.images || [],
      category_id: product.category_id || '',
      sub_category_id: product.sub_category_id || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    const { error } = await supabase.from('equipment').delete().eq('id', productToDelete.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Product deleted" });
      setProductToDelete(null);
      fetchData();
    }
  };

  const renderProductForm = (submitHandler: () => void, title: string, buttonText: string) => (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Fill in the form to add or edit a product.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Input placeholder="Product Name" value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} />
        <RichTextEditor value={formState.description} onChange={html => setFormState({ ...formState, description: html })} />
        <Select value={formState.category_id} onValueChange={value => setFormState({ ...formState, category_id: value, sub_category_id: '' })}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={formState.sub_category_id} onValueChange={value => setFormState({ ...formState, sub_category_id: value })}>
          <SelectTrigger><SelectValue placeholder="Select sub-category" /></SelectTrigger>
          <SelectContent>{subCategories.filter(sc => sc.category_id === formState.category_id).map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}</SelectContent>
        </Select>
        <div>
          <Label>Price per Day</Label>
          <Input type="number" placeholder="Price per day" value={formState.price_per_day} onChange={e => setFormState({ ...formState, price_per_day: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Stock Quantity</Label>
          <Input type="number" placeholder="Stock Quantity" value={formState.stock_quantity} onChange={e => setFormState({ ...formState, stock_quantity: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input type="number" placeholder="Sort Order" value={formState.sort_order} onChange={e => setFormState({ ...formState, sort_order: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Availability Status</Label>
          <Select value={formState.availability_status} onValueChange={value => setFormState({ ...formState, availability_status: value })}>
            <SelectTrigger><SelectValue placeholder="Select availability status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Low Stock">Low Stock</SelectItem>
              <SelectItem value="Out of Stock">Out of Stock</SelectItem>
              <SelectItem value="Temporarily Not Available">Temporarily Not Available</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Images</Label>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImageUploadDialogOpen(true)}
              className="w-full"
            >
              <Cloud className="h-4 w-4 mr-2" />
              Add Image from Cloudflare
            </Button>
            {formState.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formState.images.map((url: string, idx: number) => (
                  <div key={idx} className="relative">
                    <img
                      src={url}
                      alt={`Selected ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={() => handleRemoveImage(url)}
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button onClick={submitHandler} className="w-full">{buttonText}</Button>
      </div>
    </DialogContent>
  );

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => { 
            setEditingProduct(null); 
      setFormState({ name: '', description: '', category_id: '', sub_category_id: '', price_per_day: 0, availability_status: 'Available', stock_quantity: 0, images: [], featured: false, sort_order: 0 });
            setIsCreateDialogOpen(true); 
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild><Button variant="outline">Bulk Upload</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Bulk Upload Products</DialogTitle></DialogHeader><BulkProductUpload onComplete={() => { setIsBulkDialogOpen(false); fetchData(); }} /></DialogContent>
          </Dialog>
        </div>
      </div>
      <AdminEquipmentFilters
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        onClearFilters={() => setActiveFilters({ category: '', subcategory: '' })}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} onEdit={() => handleEditProduct(product)} onDelete={() => setProductToDelete(product)} onToggleAvailability={() => {}} />
        ))}
      </div>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>{renderProductForm(handleSaveProduct, "Create New Product", "Create Product")}</Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>{editingProduct && renderProductForm(handleSaveProduct, "Edit Product", "Save Changes")}</Dialog>
      <AlertDialog open={!!productToDelete} onOpenChange={(isOpen) => !isOpen && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{productToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProduct}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <CloudflareImageUpload
        isOpen={isImageUploadDialogOpen}
        onClose={() => setIsImageUploadDialogOpen(false)}
        onImageSelect={handleImageUpload}
      />
    </div>
  );
};

export default ProductManagement;
