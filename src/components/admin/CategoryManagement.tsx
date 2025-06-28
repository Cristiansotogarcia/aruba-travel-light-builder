import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
}

export const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formState, setFormState] = useState({ name: '', description: '', sort_order: 0 });
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (hasPermission('CategoryManagement')) {
      fetchCategories();
    }
  }, [hasPermission]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_category')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setCategories(data as Category[] || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_category')
        .insert([{ ...formState, sort_order: formState.sort_order || 0 }])
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data as Category]);
      setIsCreateDialogOpen(false);
      setFormState({ name: '', description: '', sort_order: 0 });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async (category: Category) => {
    try {
      const { error } = await supabase
        .from('equipment_category')
        .update({ sort_order: category.sort_order, name: category.name, description: category.description })
        .eq('id', category.id);

      if (error) throw error;
      toast({
        title: "Success",
        description: `Category "${category.name}" updated.`,
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category.",
        variant: "destructive",
      });
    }
  };

  const handleSortOrderChange = (id: string, sort_order: number) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, sort_order } : c));
  };
  
  const handleNameChange = (id: string, name: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };

  const handleDescriptionChange = (id: string, description: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, description } : c));
  };

  if (!hasPermission('CategoryManagement')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to access category management.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Management</CardTitle>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Enter category description"
                />
              </div>
              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formState.sort_order}
                  onChange={(e) => setFormState({ ...formState, sort_order: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <Button onClick={handleCreateCategory} className="w-full">
                Create Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-4">
              <Input
                type="number"
                value={category.sort_order || ''}
                onChange={(e) => handleSortOrderChange(category.id, Number(e.target.value))}
                className="w-20"
              />
              <Input
                value={category.name}
                onChange={(e) => handleNameChange(category.id, e.target.value)}
                className="flex-grow"
              />
              <Input
                value={category.description || ''}
                onChange={(e) => handleDescriptionChange(category.id, e.target.value)}
                className="flex-grow"
              />
              <Button onClick={() => handleUpdateCategory(category)}>Save</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryManagement;
