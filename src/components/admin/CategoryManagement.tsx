import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface SubCategory {
  id: string;
  name: string;
  sort_order: number | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  sub_categories: SubCategory[];
}

export const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', sort_order: 0 });
  const [subCategoryForm, setSubCategoryForm] = useState({ name: '', sort_order: 0 });

  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const { data: cats, error: catError } = await supabase
        .from('equipment_category')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (catError) throw catError;

      const { data: subCats, error: subCatError } = await supabase
        .from('equipment_sub_category')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (subCatError) throw subCatError;

      const categoryMap = new Map(cats.map(c => [c.id, { ...c, sub_categories: [] as SubCategory[] }]));
      subCats.forEach(sc => {
        if (sc.category_id) {
          const cat = categoryMap.get(sc.category_id);
          if (cat) {
            cat.sub_categories.push(sc);
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
  }, [toast]);

  useEffect(() => {
    if (hasPermission('CategoryManagement')) {
      fetchData();
    }
  }, [hasPermission, fetchData]);

  // Category Handlers
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description || '', sort_order: category.sort_order || 0 });
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    const dataToSave = { ...categoryForm, sort_order: categoryForm.sort_order || 0 };
    let error;
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
      fetchData();
    }
  };

  // Sub-Category Handlers
  const handleEditSubCategory = (subCategory: SubCategory, category: Category) => {
    setEditingSubCategory(subCategory);
    setParentCategory(category);
    setSubCategoryForm({ name: subCategory.name, sort_order: subCategory.sort_order || 0 });
    setIsSubCategoryDialogOpen(true);
  };
  
  const handleAddSubCategory = (category: Category) => {
    setEditingSubCategory(null);
    setParentCategory(category);
    setSubCategoryForm({ name: '', sort_order: 0 });
    setIsSubCategoryDialogOpen(true);
  };

  const handleSaveSubCategory = async () => {
    if (!parentCategory) return;
    const dataToSave = { ...subCategoryForm, category_id: parentCategory.id, sort_order: subCategoryForm.sort_order || 0 };
    let error;
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

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category & Sub-Category Management</CardTitle>
        <Button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', sort_order: 0 }); setIsCategoryDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </CardHeader>
      <CardContent>
        {categories.map(category => (
          <div key={category.id} className="p-4 border rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{category.name} (Order: {category.sort_order})</h3>
              <div>
                <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleAddSubCategory(category)}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="pl-4 mt-2 space-y-2">
              {category.sub_categories.map(sub => (
                <div key={sub.id} className="flex justify-between items-center p-2 border rounded-md">
                  <span>{sub.name} (Order: {sub.sort_order})</span>
                  <Button variant="ghost" size="sm" onClick={() => handleEditSubCategory(sub, category)}><Pencil className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit' : 'Create'} Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input placeholder="Category Name" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} />
            <Input placeholder="Description" value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} />
            <Input type="number" placeholder="Sort Order" value={categoryForm.sort_order} onChange={e => setCategoryForm({...categoryForm, sort_order: Number(e.target.value)})} />
            <Button onClick={handleSaveCategory}>Save Category</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-Category Dialog */}
      <Dialog open={isSubCategoryDialogOpen} onOpenChange={setIsSubCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubCategory ? 'Edit' : 'Create'} Sub-Category for {parentCategory?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input placeholder="Sub-Category Name" value={subCategoryForm.name} onChange={e => setSubCategoryForm({...subCategoryForm, name: e.target.value})} />
            <Input type="number" placeholder="Sort Order" value={subCategoryForm.sort_order} onChange={e => setSubCategoryForm({...subCategoryForm, sort_order: Number(e.target.value)})} />
            <Button onClick={handleSaveSubCategory}>Save Sub-Category</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CategoryManagement;
