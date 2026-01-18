import React from 'react';
import { Product } from '@/types/types';
interface EquipmentSelectionProps {
    products: Product[];
    selectedEquipment: string;
    setSelectedEquipment: (id: string) => void;
    quantity: number;
    setQuantity: (quantity: number) => void;
    currentSelectedDate?: Date | undefined;
}
declare const EquipmentSelection: React.FC<EquipmentSelectionProps>;
export default EquipmentSelection;
