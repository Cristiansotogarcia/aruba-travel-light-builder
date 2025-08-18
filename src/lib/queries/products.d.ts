export declare const getProducts: () => Promise<{
    availability: boolean;
    availability_status: string | null;
    category: string | null;
    category_id: string | null;
    created_at: string;
    description: string | null;
    featured: boolean;
    id: string;
    images: string[] | null;
    name: string;
    price_per_day: number;
    sort_order: number | null;
    stock_quantity: number;
    sub_category: string | null;
    sub_category_id: string | null;
    updated_at: string;
    equipment_category: {
        name: string;
        sort_order: number | null;
    } | null;
    equipment_sub_category: {
        name: string;
        sort_order: number | null;
    } | null;
}[]>;
export declare const getFeaturedProducts: () => Promise<{
    availability: boolean;
    availability_status: string | null;
    category: string | null;
    category_id: string | null;
    created_at: string;
    description: string | null;
    featured: boolean;
    id: string;
    images: string[] | null;
    name: string;
    price_per_day: number;
    sort_order: number | null;
    stock_quantity: number;
    sub_category: string | null;
    sub_category_id: string | null;
    updated_at: string;
}[]>;
