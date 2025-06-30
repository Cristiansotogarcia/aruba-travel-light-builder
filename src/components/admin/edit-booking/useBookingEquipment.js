import { useState } from 'react';
import { mockEquipment } from '@/data/mockEquipment';
export const useBookingEquipment = (initialItems = []) => {
    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [bookingItems, setBookingItems] = useState(initialItems);
    const calculateDays = (startDate, endDate) => {
        if (!startDate || !endDate)
            return 1;
        return Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
    };
    const addEquipment = (startDate, endDate) => {
        if (!selectedEquipment)
            return;
        const equipment = mockEquipment.find(eq => eq.id === selectedEquipment);
        if (!equipment)
            return;
        const existingItem = bookingItems.find(item => item.equipment_id === selectedEquipment);
        if (existingItem) {
            setBookingItems(items => items.map(item => item.equipment_id === selectedEquipment
                ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.equipment_price * calculateDays(startDate, endDate) }
                : item));
        }
        else {
            const days = calculateDays(startDate, endDate);
            setBookingItems(items => [...items, {
                    equipment_id: selectedEquipment,
                    equipment_name: equipment.name,
                    equipment_price: equipment.price,
                    quantity: 1,
                    subtotal: equipment.price * days
                }]);
        }
        setSelectedEquipment('');
    };
    const updateQuantity = (equipmentId, change, startDate, endDate) => {
        const days = calculateDays(startDate, endDate);
        setBookingItems(items => items.map(item => item.equipment_id === equipmentId
            ? {
                ...item,
                quantity: Math.max(1, item.quantity + change),
                subtotal: Math.max(1, item.quantity + change) * item.equipment_price * days
            }
            : item));
    };
    const removeItem = (equipmentId) => {
        setBookingItems(items => items.filter(item => item.equipment_id !== equipmentId));
    };
    return {
        selectedEquipment,
        bookingItems,
        setSelectedEquipment,
        setBookingItems,
        addEquipment,
        updateQuantity,
        removeItem
    };
};
