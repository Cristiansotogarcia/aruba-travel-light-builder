import { BookingItem } from '@/components/admin/calendar/types';
export declare const useBookingEquipment: (initialItems?: BookingItem[]) => {
    selectedEquipment: string;
    bookingItems: BookingItem[];
    setSelectedEquipment: import("react").Dispatch<import("react").SetStateAction<string>>;
    setBookingItems: import("react").Dispatch<import("react").SetStateAction<BookingItem[]>>;
    addEquipment: (startDate: string, endDate: string) => void;
    updateQuantity: (equipmentId: string, change: number, startDate: string, endDate: string) => void;
    removeItem: (equipmentId: string) => void;
};
