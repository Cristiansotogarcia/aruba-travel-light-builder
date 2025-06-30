import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
export const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingSubCategory, setEditingSubCategory] = useState(null);
    const [parentCategory, setParentCategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '', sort_order: 0 });
    const [subCategoryForm, setSubCategoryForm] = useState({ name: '', sort_order: 0 });
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    useEffect(() => {
        if (hasPermission('CategoryManagement')) {
            fetchData();
        }
    }, [hasPermission]);
    const fetchData = async () => {
        try {
            const { data: cats, error: catError } = await supabase
                .from('equipment_category')
                .select('*')
                .order('sort_order', { ascending: true, nullsFirst: false });
            if (catError)
                throw catError;
            const { data: subCats, error: subCatError } = await supabase
                .from('equipment_sub_category')
                .select('*')
                .order('sort_order', { ascending: true, nullsFirst: false });
            if (subCatError)
                throw subCatError;
            const categoryMap = new Map(cats.map(c => [c.id, { ...c, sub_categories: [] }]));
            subCats.forEach(sc => {
                if (sc.category_id) {
                    const cat = categoryMap.get(sc.category_id);
                    if (cat) {
                        cat.sub_categories.push(sc);
                    }
                }
            });
            setCategories(Array.from(categoryMap.values()));
        }
        catch (error) {
            console.error('Error fetching data:', error);
            toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    };
    // Category Handlers
    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setCategoryForm({ name: category.name, description: category.description || '', sort_order: category.sort_order || 0 });
        setIsCategoryDialogOpen(true);
    };
    const handleSaveCategory = async () => {
        const dataToSave = { ...categoryForm, sort_order: categoryForm.sort_order || 0 };
        let error;
        if (editingCategory) {
            ({ error } = await supabase.from('equipment_category').update(dataToSave).eq('id', editingCategory.id));
        }
        else {
            ({ error } = await supabase.from('equipment_category').insert([dataToSave]));
        }
        if (error) {
            toast({ title: "Error", description: "Failed to save category", variant: "destructive" });
        }
        else {
            toast({ title: "Success", description: "Category saved" });
            setIsCategoryDialogOpen(false);
            setEditingCategory(null);
            fetchData();
        }
    };
    // Sub-Category Handlers
    const handleEditSubCategory = (subCategory, category) => {
        setEditingSubCategory(subCategory);
        setParentCategory(category);
        setSubCategoryForm({ name: subCategory.name, sort_order: subCategory.sort_order || 0 });
        setIsSubCategoryDialogOpen(true);
    };
    const handleAddSubCategory = (category) => {
        setEditingSubCategory(null);
        setParentCategory(category);
        setSubCategoryForm({ name: '', sort_order: 0 });
        setIsSubCategoryDialogOpen(true);
    };
    const handleSaveSubCategory = async () => {
        if (!parentCategory)
            return;
        const dataToSave = { ...subCategoryForm, category_id: parentCategory.id, sort_order: subCategoryForm.sort_order || 0 };
        let error;
        if (editingSubCategory) {
            ({ error } = await supabase.from('equipment_sub_category').update(dataToSave).eq('id', editingSubCategory.id));
        }
        else {
            ({ error } = await supabase.from('equipment_sub_category').insert([dataToSave]));
        }
        if (error) {
            toast({ title: "Error", description: "Failed to save sub-category", variant: "destructive" });
        }
        else {
            toast({ title: "Success", description: "Sub-category saved" });
            setIsSubCategoryDialogOpen(false);
            setEditingSubCategory(null);
            setParentCategory(null);
            fetchData();
        }
    };
    if (loading)
        return _jsx(Skeleton, { className: "h-64 w-full" });
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Category & Sub-Category Management" }), _jsxs(Button, { onClick: () => { setEditingCategory(null); setCategoryForm({ name: '', description: '', sort_order: 0 }); setIsCategoryDialogOpen(true); }, children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), " Add Category"] })] }), _jsx(CardContent, { children: categories.map(category => (_jsxs("div", { className: "p-4 border rounded-lg mb-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h3", { className: "text-lg font-semibold", children: [category.name, " (Order: ", category.sort_order, ")"] }), _jsxs("div", { children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleEditCategory(category), children: _jsx(Pencil, { className: "h-4 w-4" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleAddSubCategory(category), children: _jsx(Plus, { className: "h-4 w-4" }) })] })] }), _jsx("div", { className: "pl-4 mt-2 space-y-2", children: category.sub_categories.map(sub => (_jsxs("div", { className: "flex justify-between items-center p-2 border rounded-md", children: [_jsxs("span", { children: [sub.name, " (Order: ", sub.sort_order, ")"] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleEditSubCategory(sub, category), children: _jsx(Pencil, { className: "h-4 w-4" }) })] }, sub.id))) })] }, category.id))) }), _jsx(Dialog, { open: isCategoryDialogOpen, onOpenChange: setIsCategoryDialogOpen, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: [editingCategory ? 'Edit' : 'Create', " Category"] }) }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsx(Input, { placeholder: "Category Name", value: categoryForm.name, onChange: e => setCategoryForm({ ...categoryForm, name: e.target.value }) }), _jsx(Input, { placeholder: "Description", value: categoryForm.description, onChange: e => setCategoryForm({ ...categoryForm, description: e.target.value }) }), _jsx(Input, { type: "number", placeholder: "Sort Order", value: categoryForm.sort_order, onChange: e => setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) }) }), _jsx(Button, { onClick: handleSaveCategory, children: "Save Category" })] })] }) }), _jsx(Dialog, { open: isSubCategoryDialogOpen, onOpenChange: setIsSubCategoryDialogOpen, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: [editingSubCategory ? 'Edit' : 'Create', " Sub-Category for ", parentCategory?.name] }) }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsx(Input, { placeholder: "Sub-Category Name", value: subCategoryForm.name, onChange: e => setSubCategoryForm({ ...subCategoryForm, name: e.target.value }) }), _jsx(Input, { type: "number", placeholder: "Sort Order", value: subCategoryForm.sort_order, onChange: e => setSubCategoryForm({ ...subCategoryForm, sort_order: Number(e.target.value) }) }), _jsx(Button, { onClick: handleSaveSubCategory, children: "Save Sub-Category" })] })] }) })] }));
};
export default CategoryManagement;
