import React from 'react';
import { Product, BookingItem } from '@/types/types';
interface EquipmentSelectionProps {
    products: Product[];
    selectedEquipment: string;
    setSelectedEquipment: (id: string) => void;
    quantity: number;
    setQuantity: (quantity: number) => void;
    addEquipment: (equipment: Product, quantity: number, selectedDate: Date | undefined) => void;
    bookingItems: BookingItem[];
    removeEquipment: (equipment_id: string) => void;
    currentSelectedDate?: Date | undefined;
}
declare const EquipmentSelection: React.FC<EquipmentSelectionProps>;
export default EquipmentSelection;
