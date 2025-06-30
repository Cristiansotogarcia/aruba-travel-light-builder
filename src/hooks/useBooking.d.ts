import { Product, BookingFormData, CustomerInfo } from '../types/types';
declare const useBooking: () => {
    products: Product[];
    bookingData: BookingFormData;
    selectedEquipment: string;
    quantity: number;
    isSubmitting: boolean;
    addEquipment: (equipment: Product, quantity: number, selectedDate: Date | undefined) => void;
    removeEquipment: (equipmentId: string) => void;
    updateCustomerInfo: (field: keyof CustomerInfo, value: string) => void;
    updateDates: (field: "startDate" | "endDate", value: string) => void;
    calculateTotal: () => number;
    calculateDays: () => number;
    submitBooking: (e: React.FormEvent) => Promise<void>;
    setSelectedEquipment: import("react").Dispatch<import("react").SetStateAction<string>>;
    setQuantity: import("react").Dispatch<import("react").SetStateAction<number>>;
    setBookingData: import("react").Dispatch<import("react").SetStateAction<BookingFormData>>;
};
export default useBooking;
