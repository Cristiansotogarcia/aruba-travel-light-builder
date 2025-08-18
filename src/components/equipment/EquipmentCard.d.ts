interface Equipment {
    id: string;
    name: string;
    slug: string;
    category: string;
    price: number;
    image: string;
    images: string[];
    description: string;
    availability: 'available' | 'limited' | 'unavailable';
    features: string[];
}
interface EquipmentCardProps {
    equipment: Equipment;
}
export declare const EquipmentCard: ({ equipment }: EquipmentCardProps) => import("react/jsx-runtime").JSX.Element;
export {};
