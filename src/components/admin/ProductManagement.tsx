
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
// import { LoadingState } from '@/components/ui/LoadingState'; // Removed LoadingState
import { Skeleton } from '@/components/ui/skeleton'; // Added Skeleton
import { BulkProductUpload } from './BulkProductUpload';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProductCard } from './ProductCard';
import type { Product as GlobalProduct, AvailabilityStatus } from '@/types/types'; // Import global Product and AvailabilityStatus

// Use the global Product type
interface Product extends GlobalProduct {}

// Helper function to map Supabase data to Product type
const mapSupabaseToProduct = (data: any): Product => {
  return {
    id: data.id,
    name: data.name,
    description: data.description ?? '',
    price_per_day: data.price_per_day,
    category: data.category,
    image_url: data.image_url ?? '', // Default to empty string if null/undefined
    stock_quantity: data.stock_quantity ?? 0, // Default to 0 if null/undefined
    availability_status: data.availability_status ?? 'Available', // Default to 'Available'
    featured: data.featured ?? false,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

const categories = [
  'Beach Equipment',
  'Camping',
  'Electronics',
  'Transportation',
  'Accessories'
];

export const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Adjusted formState to align with the global Product type
  const [formState, setFormState] = useState<Omit<Product, 'id' | 'created_at' | 'updated_at'> & { image_url_temp?: string; imageFile?: File | null }> ({
    name: '',
    description: '',
    category: '',
    price_per_day: 0,
    availability_status: 'Available', // Default to a valid AvailabilityStatus
    stock_quantity: 0,
    image_url: '', // Use image_url directly
    featured: false,
    image_url_temp: '',
    imageFile: null
  });

  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(`products/${Date.now()}-${file.name}`, file, { upsert: true });
    if (error || !data) return null;
    const urlRes = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);
    return urlRes.data.publicUrl;
  };

  useEffect(() => {
    if (hasPermission('ProductManagement')) {
      fetchProducts();
    }
  }, [hasPermission]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Ensure fetched data conforms to Product type using the helper
      const fetchedProducts: Product[] = data ? data.map(mapSupabaseToProduct) : [];
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      let imageUrl = formState.image_url_temp || formState.image_url || null;
      if (formState.imageFile) {
        const uploaded = await uploadImage(formState.imageFile);
        if (uploaded) imageUrl = uploaded;
      }
      const productDataToSave = {
        name: formState.name,
        description: formState.description || null, // Allow null for description if empty
        category: formState.category,
        price_per_day: formState.price_per_day,
        availability_status: formState.availability_status as AvailabilityStatus,
        stock_quantity: formState.stock_quantity,
        image_url: imageUrl,
        featured: formState.featured,
      };

      const { data, error } = await supabase
        .from('equipment')
        .insert([productDataToSave])
        .select()
        .single();

      if (error) throw error;
      // Ensure new data conforms to Product type using the helper
      const newProduct: Product = mapSupabaseToProduct(data);
      setProducts(prev => [newProduct, ...prev]);
      setIsCreateDialogOpen(false);
      setFormState({
        name: '',
        description: '',
        category: '',
        price_per_day: 0,
        availability_status: 'Available',
        stock_quantity: 0,
        image_url: '',
        featured: false,
        image_url_temp: '',
        imageFile: null,
      });

      toast({
        title: "Success",
        description: "Product created successfully",
      });
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price_per_day: product.price_per_day,
      availability_status: product.availability_status || 'Available',
      stock_quantity: product.stock_quantity,
      image_url: product.image_url || '',
      image_url_temp: product.image_url || '',
      featured: product.featured ?? false,
      imageFile: null,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      let imageUrl = formState.image_url_temp || formState.image_url || null;
      if (formState.imageFile) {
        const uploaded = await uploadImage(formState.imageFile);
        if (uploaded) imageUrl = uploaded;
      }
      const productDataToUpdate: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>> = {
        name: formState.name,
        description: formState.description || null,
        category: formState.category,
        price_per_day: formState.price_per_day,
        availability_status: formState.availability_status as AvailabilityStatus,
        stock_quantity: formState.stock_quantity,
        image_url: imageUrl,
        featured: formState.featured,
      };

      const { data, error } = await supabase
        .from('equipment')
        .update(productDataToUpdate)
        .eq('id', editingProduct.id)
        .select()
        .single();

      if (error) throw error;
      // Ensure updated data conforms to Product type using the helper
      const updatedProduct: Product = mapSupabaseToProduct(data);
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p));
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      setFormState(prev => ({ ...prev, imageFile: null }));
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setProductToDelete(null); // Close dialog implicitly by resetting this
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const toggleAvailabilityStatus = async (product: Product) => {
    const newStatus: AvailabilityStatus = product.availability_status === 'Available' ? 'Out of Stock' : 'Available';
    try {
      const { data, error } = await supabase
        .from('equipment')
        .update({ availability_status: newStatus } as any) // Cast to any to bypass incorrect type inference
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;

      // Ensure the updated product from DB is used for state update using the helper
      const updatedProductFromDB: Product = mapSupabaseToProduct(data);

      setProducts(prevProducts => 
        prevProducts.map(p => p.id === updatedProductFromDB.id ? updatedProductFromDB : p)
      );
      toast({
        title: "Success",
        description: `Product availability updated to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating product availability:', error);
      toast({
        title: "Error",
        description: "Failed to update product availability.",
        variant: "destructive",
      });
    }
  };

  const renderProductForm = (submitHandler: () => void, title: string, buttonText: string) => (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            value={formState.name}
            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
            placeholder="Enter product name"
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formState.description || ''} // Ensure value is not null for Textarea
            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
            placeholder="Enter product description"
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formState.category}
            onValueChange={(value) => setFormState({ ...formState, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="price">Price per Day ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formState.price_per_day}
            onChange={(e) => setFormState({ ...formState, price_per_day: Number(e.target.value) })}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="stock_quantity">Stock Quantity</Label>
          <Input
            id="stock_quantity"
            type="number"
            step="1"
            value={formState.stock_quantity}
            onChange={(e) => setFormState({ ...formState, stock_quantity: Number(e.target.value) })}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="image_url">Image URL</Label>
          <Input
            id="image_url"
            value={formState.image_url_temp || ''} // Ensure value is not null for Input
            onChange={(e) => setFormState({ ...formState, image_url_temp: e.target.value })}
            placeholder="Enter image URL (optional)"
          />
        </div>
        <div>
          <Label htmlFor="image_file">Upload Image</Label>
          <Input
            id="image_file"
            type="file"
            accept="image/*"
            onChange={(e) => setFormState({ ...formState, imageFile: e.target.files?.[0] || null })}
          />
        </div>
        <div>
          <Label htmlFor="product-availability_status">Availability Status</Label>
          <Select
            value={formState.availability_status}
            onValueChange={(value) => setFormState(prev => ({ ...prev, availability_status: value as AvailabilityStatus }))}
          >
            <SelectTrigger id="product-availability_status"> {/* Changed ID to be more generic */}
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Low Stock">Low Stock</SelectItem>
              <SelectItem value="Out of Stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <input
            id="featured"
            type="checkbox"
            checked={formState.featured}
            onChange={(e) => setFormState({ ...formState, featured: e.target.checked })}
          />
          <Label htmlFor="featured">Featured</Label>
        </div>
        {/* Removed duplicate Select for Availability Status */}
        <Button onClick={submitHandler} className="w-full">
          {buttonText}
        </Button>
      </div>
    </DialogContent>
  );

  if (!hasPermission('ProductManagement')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to access product management.</p>
      </div>
    );
  }

  if (loading) { // Moved loading check here
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-1/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    // <LoadingState isLoading={loading} message="Loading products..."> // Removed LoadingState wrapper
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
        </div>
        <p className="text-gray-600 mt-1">Manage your equipment inventory</p>
      </div>
      {/* This div was closing prematurely, now it wraps all subsequent elements */}
      <div> 
        <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => {
          setIsCreateDialogOpen(isOpen);
          if (!isOpen) {
            setFormState({ name: '', description: '', category: '', price_per_day: 0, availability_status: 'Available', stock_quantity: 0, image_url: '', featured: false, image_url_temp: '', imageFile: null });
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setFormState({ name: '', description: '', category: '', price_per_day: 0, availability_status: 'Available', stock_quantity: 0, image_url: '', featured: false, image_url_temp: '', imageFile: null });
              setIsCreateDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          {renderProductForm(handleCreateProduct, "Create New Product", "Create Product")}
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="ml-2" onClick={() => setIsBulkDialogOpen(true)}>
              Bulk Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Upload Products</DialogTitle>
            </DialogHeader>
            <BulkProductUpload onComplete={() => { setIsBulkDialogOpen(false); fetchProducts(); }} />
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
          setIsEditDialogOpen(isOpen);
          if (!isOpen) {
            setEditingProduct(null);
            setFormState(prev => ({ ...prev, imageFile: null }));
          }
        }}>
          {editingProduct && renderProductForm(handleUpdateProduct, "Edit Product", "Save Changes")}
        </Dialog>

        {/* Delete Product Confirmation Dialog */}
        <AlertDialog open={!!productToDelete} onOpenChange={(isOpen) => {
          if (!isOpen) setProductToDelete(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the product "{productToDelete?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProduct}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.length > 0 ? (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={handleEditProduct}
                onDelete={() => setProductToDelete(product)}
                onToggleAvailability={toggleAvailabilityStatus}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No products found. Create your first product to get started.</p>
            </div>
          )}
        </div>
      </div> {/* Closing the wrapping div */}
    </div>
    // </LoadingState> // Removed LoadingState wrapper
  );
};

export default ProductManagement;
