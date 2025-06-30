import { BookingItem } from '@/components/admin/calendar/types';
interface EquipmentSelectionSectionProps {
    selectedEquipment: string;
    bookingItems: BookingItem[];
    onSelectedEquipmentChange: (equipmentId: string) => void;
    onAddEquipment: () => void;
    onUpdateQuantity: (equipmentId: string, change: number) => void;
    onRemoveItem: (equipmentId: string) => void;
}
export declare const EquipmentSelectionSection: ({ selectedEquipment, bookingItems, onSelectedEquipmentChange, onAddEquipment, onUpdateQuantity, onRemoveItem }: EquipmentSelectionSectionProps) => import("react/jsx-runtime").JSX.Element;
export {};
