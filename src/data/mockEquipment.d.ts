export interface Equipment {
    id: string;
    name: string;
    category: string;
    price: number;
    image: string;
    description: string;
    availability: 'available' | 'limited' | 'unavailable';
    features: string[];
}
export declare const mockEquipment: Equipment[];
export declare const getAvailableCategories: () => string[];
export declare const getAvailabilityOptions: () => string[];
export declare const getPriceRange: () => [number, number];
