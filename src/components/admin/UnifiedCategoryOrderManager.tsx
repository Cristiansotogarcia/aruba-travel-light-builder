import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Save, RefreshCw, ArrowUp, ArrowDown, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_per_day: number;
  sort_order: number | null;
  sub_category_id: string | null;
  stock_quantity: number;
  availability_status: string | null;
}

interface SubCategory {
  id: string;
  name: string;
  sort_order: number | null;
  category_id: string | null;
  products: Product[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  sub_categories: SubCategory[];
}

export const UnifiedCategoryOrderManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  
  // Editing states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Parent relationships
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [parentSubCategory, setParentSubCategory] = useState<SubCategory | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', sort_order: 0 });
  const [subCategoryForm, setSubCategoryForm] = useState({ name: '', sort_order: 0 });
  const [productForm, setProductForm] = useState({ name: '', sort_order: 0 });

  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasPermission('CategoryManagement')) {
      fetchData();
    }
  }, [hasPermission]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: cats, error: catError } = await supabase
        .from('equipment_category')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (catError) throw catError;

      // Fetch subcategories
      const { data: subCats, error: subCatError } = await supabase
        .from('equipment_sub_category')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (subCatError) throw subCatError;

      // Fetch products
      const { data: products, error: prodError } = await supabase
        .from('equipment')
        .select('id, name, description, price_per_day, sort_order, sub_category_id, stock_quantity, availability_status')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (prodError) throw prodError;

      // Build hierarchical structure
      const categoryMap = new Map(cats.map(c => [c.id, { ...c, sub_categories: [] as SubCategory[] }]));
      const subCategoryMap = new Map(subCats.map(sc => [sc.id, { ...sc, products: [] as Product[] }]));

      // Link subcategories to categories
      subCats.forEach(sc => {
        if (sc.category_id) {
          const cat = categoryMap.get(sc.category_id);
          if (cat) {
            cat.sub_categories.push(subCategoryMap.get(sc.id)!);
          }
        }
      });

      // Link products to subcategories
      products.forEach(product => {
        if (product.sub_category_id) {
          const subCat = subCategoryMap.get(product.sub_category_id);
          if (subCat) {
            subCat.products.push(product);
          }
        }
      });

      setCategories(Array.from(categoryMap.values()));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Update categories
      for (let index = 0; index < categories.length; index++) {
        const cat = categories[index];
        await supabase
          .from('equipment_category')
          .update({ sort_order: index })
          .eq('id', cat.id);
      }

      // Update subcategories
      for (const category of categories) {
        for (let index = 0; index < category.sub_categories.length; index++) {
          const sub = category.sub_categories[index];
          await supabase
            .from('equipment_sub_category')
            .update({ sort_order: index, category_id: category.id })
            .eq('id', sub.id);
        }
      }

      // Update products
      for (const category of categories) {
        for (const subCategory of category.sub_categories) {
          for (let index = 0; index < subCategory.products.length; index++) {
            const product = subCategory.products[index];
            await supabase
              .from('equipment')
              .update({ sort_order: index, sub_category_id: subCategory.id })
              .eq('id', product.id);
          }
        }
      }

      // Invalidate React Query cache to reflect changes on the frontend
      await queryClient.invalidateQueries({ queryKey: ['equipment-products'] });
      
      toast({ title: "Success", description: "All changes saved successfully" });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Toggle expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleSubCategory = (subCategoryId: string) => {
    setExpandedSubCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subCategoryId)) {
        newSet.delete(subCategoryId);
      } else {
        newSet.add(subCategoryId);
      }
      return newSet;
    });
  };

  // Category Handlers
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({ 
      name: category.name, 
      description: category.description || '', 
      sort_order: category.sort_order || 0 
    });
    setIsCategoryDialogOpen(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', sort_order: categories.length });
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    const dataToSave = { ...categoryForm, sort_order: categoryForm.sort_order || 0 };
    let error: any;
    
    if (editingCategory) {
      ({ error } = await supabase.from('equipment_category').update(dataToSave).eq('id', editingCategory.id));
    } else {
      ({ error } = await supabase.from('equipment_category').insert([dataToSave]));
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save category", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Category saved" });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      queryClient.invalidateQueries({ queryKey: ['equipment-products'] });
      fetchData();
    }
  };

  // Sub-Category Handlers
  const handleEditSubCategory = (subCategory: SubCategory, category: Category) => {
    setEditingSubCategory(subCategory);
    setParentCategory(category);
    setSubCategoryForm({ 
      name: subCategory.name, 
      sort_order: subCategory.sort_order || 0 
    });
    setIsSubCategoryDialogOpen(true);
  };

  const handleAddSubCategory = (category: Category) => {
    setEditingSubCategory(null);
    setParentCategory(category);
    setSubCategoryForm({ 
      name: '', 
      sort_order: category.sub_categories.length 
    });
    setIsSubCategoryDialogOpen(true);
  };

  const handleSaveSubCategory = async () => {
    if (!parentCategory) return;
    
    const dataToSave = { 
      ...subCategoryForm, 
      category_id: parentCategory.id, 
      sort_order: subCategoryForm.sort_order || 0 
    };
    
    let error: any;
    if (editingSubCategory) {
      ({ error } = await supabase.from('equipment_sub_category').update(dataToSave).eq('id', editingSubCategory.id));
    } else {
      ({ error } = await supabase.from('equipment_sub_category').insert([dataToSave]));
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save sub-category", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Sub-category saved" });
      setIsSubCategoryDialogOpen(false);
      setEditingSubCategory(null);
      setParentCategory(null);
      fetchData();
    }
  };

  // Product Handlers
  const handleEditProduct = (product: Product, subCategory: SubCategory) => {
    setEditingProduct(product);
    setParentSubCategory(subCategory);
    setProductForm({ 
      name: product.name, 
      sort_order: product.sort_order || 0 
    });
    setIsProductDialogOpen(true);
  };

  const handleAddProduct = (subCategory: SubCategory) => {
    setEditingProduct(null);
    setParentSubCategory(subCategory);
    setProductForm({ 
      name: '', 
      sort_order: subCategory.products.length 
    });
    setIsProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!parentSubCategory) return;
    
    const dataToSave = { 
      ...productForm, 
      sub_category_id: parentSubCategory.id, 
      sort_order: productForm.sort_order || 0 
    };
    
    let error: any;
    if (editingProduct) {
      ({ error } = await supabase.from('equipment').update(dataToSave).eq('id', editingProduct.id));
    } else {
      ({ error } = await supabase.from('equipment').insert([{ ...dataToSave, price_per_day: 0, stock_quantity: 1, availability_status: 'Available' }]));
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save product", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Product saved" });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      setParentSubCategory(null);
      fetchData();
    }
  };

  // Order management functions
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= categories.length) return;
    
    [newCategories[index], newCategories[newIndex]] = [newCategories[newIndex], newCategories[index]];
    setCategories(newCategories.map((cat, idx) => ({ ...cat, sort_order: idx })));
  };

  const moveSubCategory = (categoryIndex: number, subIndex: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const category = newCategories[categoryIndex];
    const newSubIndex = direction === 'up' ? subIndex - 1 : subIndex + 1;
    
    if (newSubIndex < 0 || newSubIndex >= category.sub_categories.length) return;
    
    [category.sub_categories[subIndex], category.sub_categories[newSubIndex]] = 
      [category.sub_categories[newSubIndex], category.sub_categories[subIndex]];
    
    category.sub_categories = category.sub_categories.map((sub, idx) => ({ 
      ...sub, 
      sort_order: idx 
    }));
    
    setCategories(newCategories);
  };

  const moveProduct = (categoryIndex: number, subIndex: number, productIndex: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const subCategory = newCategories[categoryIndex].sub_categories[subIndex];
    const newProductIndex = direction === 'up' ? productIndex - 1 : productIndex + 1;
    
    if (newProductIndex < 0 || newProductIndex >= subCategory.products.length) return;
    
    [subCategory.products[productIndex], subCategory.products[newProductIndex]] = 
      [subCategory.products[newProductIndex], subCategory.products[productIndex]];
    
    subCategory.products = subCategory.products.map((product, idx) => ({ 
      ...product, 
      sort_order: idx 
    }));
    
    setCategories(newCategories);
  };

  // Delete functions
  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? All subcategories and products will be affected.')) return;
    
    try {
      await supabase.from('equipment_category').delete().eq('id', categoryId);
      toast({ title: "Success", description: "Category deleted" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    }
  };

  const deleteSubCategory = async (subCategoryId: string) => {
    if (!confirm('Are you sure you want to delete this subcategory? All products will be moved to uncategorized.')) return;
    
    try {
      await supabase.from('equipment_sub_category').delete().eq('id', subCategoryId);
      toast({ title: "Success", description: "Subcategory deleted" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete subcategory", variant: "destructive" });
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await supabase.from('equipment').delete().eq('id', productId);
      toast({ title: "Success", description: "Product deleted" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Category, Subcategory & Product Management</h1>
          <p className="text-gray-600 mt-1">Manage categories, subcategories, and products with their display order in one place</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleSaveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleAddCategory}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Category
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map((category, categoryIndex) => (
          <div key={category.id} className="border rounded-lg">
            <div className="p-4 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {expandedCategories.has(category.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <span className="font-semibold text-lg">{category.name}</span>
                <span className="text-sm text-gray-500">({category.sub_categories.length} subcategories)</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveCategory(categoryIndex, 'up')}
                  disabled={categoryIndex === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveCategory(categoryIndex, 'down')}
                  disabled={categoryIndex === categories.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditCategory(category)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCategory(category.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {expandedCategories.has(category.id) && (
              <div className="p-4 border-t">
                <div className="flex justify-end mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSubCategory(category)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Subcategory
                  </Button>
                </div>

                <div className="space-y-3">
                  {category.sub_categories.map((sub, subIndex) => (
                    <div key={sub.id} className="border rounded-lg">
                      <div className="p-3 bg-blue-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSubCategory(sub.id)}
                            className="p-1 hover:bg-blue-200 rounded"
                          >
                            {expandedSubCategories.has(sub.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <span className="font-medium">{sub.name}</span>
                          <span className="text-sm text-gray-500">({sub.products.length} products)</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSubCategory(categoryIndex, subIndex, 'up')}
                            disabled={subIndex === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSubCategory(categoryIndex, subIndex, 'down')}
                            disabled={subIndex === category.sub_categories.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSubCategory(sub, category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSubCategory(sub.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {expandedSubCategories.has(sub.id) && (
                        <div className="p-3 border-t">
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddProduct(sub)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Product
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {sub.products.map((product, productIndex) => (
                              <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                                <div>
                                  <span className="font-medium">{product.name}</span>
                                  <span className="text-sm text-gray-500 ml-2">${product.price_per_day}/day</span>
                                  <span className="text-sm text-gray-500 ml-2">({product.stock_quantity} in stock)</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveProduct(categoryIndex, subIndex, productIndex, 'up')}
                                    disabled={productIndex === 0}
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveProduct(categoryIndex, subIndex, productIndex, 'down')}
                                    disabled={productIndex === sub.products.length - 1}
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProduct(product, sub)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteProduct(product.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit' : 'Create'} Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Category Name" 
              value={categoryForm.name} 
              onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} 
            />
            <Input 
              placeholder="Description" 
              value={categoryForm.description} 
              onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} 
            />
            <Input 
              type="number" 
              placeholder="Sort Order" 
              value={categoryForm.sort_order} 
              onChange={e => setCategoryForm({...categoryForm, sort_order: Number(e.target.value)})} 
            />
            <Button onClick={handleSaveCategory}>Save Category</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-Category Dialog */}
      <Dialog open={isSubCategoryDialogOpen} onOpenChange={setIsSubCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubCategory ? 'Edit' : 'Create'} Subcategory
              {parentCategory && ` for ${parentCategory.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Subcategory Name" 
              value={subCategoryForm.name} 
              onChange={e => setSubCategoryForm({...subCategoryForm, name: e.target.value})} 
            />
            <Input 
              type="number" 
              placeholder="Sort Order" 
              value={subCategoryForm.sort_order} 
              onChange={e => setSubCategoryForm({...subCategoryForm, sort_order: Number(e.target.value)})} 
            />
            <Button onClick={handleSaveSubCategory}>Save Subcategory</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit' : 'Create'} Product
              {parentSubCategory && ` for ${parentSubCategory.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Product Name" 
              value={productForm.name} 
              onChange={e => setProductForm({...productForm, name: e.target.value})} 
            />
            <Input 
              type="number" 
              placeholder="Sort Order" 
              value={productForm.sort_order} 
              onChange={e => setProductForm({...productForm, sort_order: Number(e.target.value)})} 
            />
            <Button onClick={handleSaveProduct}>Save Product</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedCategoryOrderManager;
