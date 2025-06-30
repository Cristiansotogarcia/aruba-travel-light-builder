import type { Product as GlobalProduct } from '@/types/types';
interface Product extends GlobalProduct {
}
interface ProductCardProps {
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    onToggleAvailability: (product: Product) => void;
}
export declare const ProductCard: ({ product, onEdit, onDelete, onToggleAvailability }: ProductCardProps) => import("react/jsx-runtime").JSX.Element;
export {};
