interface Equipment {
    id: string;
    name: string;
    category: string;
    price: number;
    image: string;
    description: string;
    availability: 'available' | 'limited' | 'unavailable';
    features: string[];
}
interface EquipmentCardProps {
    equipment: Equipment;
}
export declare const EquipmentCard: ({ equipment }: EquipmentCardProps) => import("react/jsx-runtime").JSX.Element;
export {};
