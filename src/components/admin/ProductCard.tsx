import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Package } from 'lucide-react';
import type { Product as GlobalProduct } from '@/types/types';

interface Product extends GlobalProduct {}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
}

export const ProductCard = ({ product, onEdit, onDelete, onToggleAvailability }: ProductCardProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <Card key={product.id} className="flex flex-col">
      {product.image_url && (
        <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-t-lg" />
      )}
      <CardHeader className="flex-grow-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{product.name}</CardTitle>
          <Badge variant={product.availability_status === 'Available' ? "default" : product.availability_status === 'Low Stock' ? "outline" : "secondary"}>
            {product.availability_status ? product.availability_status : 'Unknown'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="space-y-3 mb-4">
          <p className="text-sm text-gray-600 h-16 overflow-y-auto">{product.description || 'No description available.'}</p>
          <div className="text-sm text-gray-500">Category: {product.category || 'Uncategorized'}</div>
          <div className="text-sm text-gray-500">Sub-Category: {(product as any).sub_category || 'N/A'}</div>
          <div className="text-sm text-gray-500">Stock: {product.stock_quantity}</div>
          <div className="text-lg font-bold text-green-600">
            {"$"}
            {Number(product.price_per_day).toFixed(2)}/day
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t mt-auto">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(product)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleAvailability(product)}
          >
            <Package className="h-4 w-4 mr-1" />
            {product.availability_status === 'Available' ? 'Set Out of Stock' : 'Set Available'}
          </Button>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the product "{product.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(product)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
