import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Minus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mockEquipment } from '@/data/mockEquipment';
export const EditBookingModal = ({ booking, onBookingUpdated, onClose, open }) => {
    const [startDate, setStartDate] = useState();
    const [endDate, setEndDate] = useState();
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });
    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [bookingItems, setBookingItems] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    useEffect(() => {
        if (booking && open) {
            setStartDate(new Date(booking.start_date));
            setEndDate(new Date(booking.end_date));
            setCustomerInfo({
                name: booking.customer_name,
                email: booking.customer_email,
                phone: booking.customer_phone,
                address: booking.customer_address
            });
            setBookingItems(booking.booking_items || []);
            setDiscount(0);
        }
    }, [booking, open]);
    const addEquipment = () => {
        if (!selectedEquipment)
            return;
        const equipment = mockEquipment.find(eq => eq.id === selectedEquipment);
        if (!equipment)
            return;
        const existingItem = bookingItems.find(item => item.equipment_id === selectedEquipment);
        if (existingItem) {
            setBookingItems(items => items.map(item => item.equipment_id === selectedEquipment
                ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * (item.equipment_price || equipment.price) * calculateDays() }
                : item));
        }
        else {
            const days = calculateDays();
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
    const updateQuantity = (equipmentId, change) => {
        const days = calculateDays();
        setBookingItems(items => items.map(item => item.equipment_id === equipmentId
            ? {
                ...item,
                quantity: Math.max(1, item.quantity + change),
                subtotal: Math.max(1, item.quantity + change) * (item.equipment_price || 0) * days
            }
            : item));
    };
    const removeItem = (equipmentId) => {
        setBookingItems(items => items.filter(item => item.equipment_id !== equipmentId));
    };
    const calculateDays = () => {
        if (!startDate || !endDate)
            return 1;
        return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    };
    const calculateSubtotal = () => {
        return bookingItems.reduce((total, item) => total + item.subtotal, 0);
    };
    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        return subtotal - discount;
    };
    const handleSubmit = async () => {
        if (!startDate || !endDate || bookingItems.length === 0) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields and add at least one equipment item.",
                variant: "destructive"
            });
            return;
        }
        setLoading(true);
        try {
            const totalAmount = calculateTotal();
            // Update the booking record
            const { error: bookingError } = await supabase
                .from('bookings')
                .update({
                customer_name: customerInfo.name,
                customer_email: customerInfo.email,
                customer_phone: customerInfo.phone,
                customer_address: customerInfo.address,
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                total_amount: totalAmount,
                updated_at: new Date().toISOString()
            })
                .eq('id', booking.id);
            if (bookingError)
                throw bookingError;
            // Delete existing booking items
            const { error: deleteError } = await supabase
                .from('booking_items')
                .delete()
                .eq('booking_id', booking.id);
            if (deleteError)
                throw deleteError;
            // Create new booking items
            const bookingItemsData = bookingItems.map(item => ({
                booking_id: booking.id,
                equipment_id: item.equipment_id,
                equipment_name: item.equipment_name,
                equipment_price: item.equipment_price || 0,
                quantity: item.quantity,
                subtotal: item.subtotal
            }));
            const { error: itemsError } = await supabase
                .from('booking_items')
                .insert(bookingItemsData);
            if (itemsError)
                throw itemsError;
            toast({
                title: "Booking Updated Successfully!",
                description: `Booking #${booking.id.substring(0, 8)} has been updated.`,
            });
            onBookingUpdated();
            onClose();
        }
        catch (error) {
            console.error('Error updating booking:', error);
            toast({
                title: "Error Updating Booking",
                description: "There was an error updating the booking. Please try again.",
                variant: "destructive"
            });
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Edit Booking #", booking.id.substring(0, 8)] }) }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-lg font-medium", children: "Customer Information" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "name", children: "Name" }), _jsx(Input, { id: "name", value: customerInfo.name, onChange: (e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value })), placeholder: "Customer name" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", type: "email", value: customerInfo.email, onChange: (e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value })), placeholder: "customer@email.com" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "phone", children: "Phone" }), _jsx(Input, { id: "phone", value: customerInfo.phone, onChange: (e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value })), placeholder: "Phone number" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "address", children: "Address" }), _jsx(Input, { id: "address", value: customerInfo.address, onChange: (e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value })), placeholder: "Customer address" })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-lg font-medium", children: "Rental Period" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Start Date" }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground"), children: [_jsx(CalendarIcon, { className: "mr-2 h-4 w-4" }), startDate ? format(startDate, "dd/MM/yyyy") : "Pick start date"] }) }), _jsx(PopoverContent, { className: "w-auto p-0", children: _jsx(Calendar, { mode: "single", selected: startDate, onSelect: setStartDate, className: "pointer-events-auto" }) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "End Date" }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground"), children: [_jsx(CalendarIcon, { className: "mr-2 h-4 w-4" }), endDate ? format(endDate, "dd/MM/yyyy") : "Pick end date"] }) }), _jsx(PopoverContent, { className: "w-auto p-0", children: _jsx(Calendar, { mode: "single", selected: endDate, onSelect: setEndDate, className: "pointer-events-auto" }) })] })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-lg font-medium", children: "Equipment" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Select, { value: selectedEquipment, onValueChange: setSelectedEquipment, children: [_jsx(SelectTrigger, { className: "flex-1", children: _jsx(SelectValue, { placeholder: "Select equipment" }) }), _jsx(SelectContent, { children: mockEquipment.map((equipment) => (_jsxs(SelectItem, { value: equipment.id, children: [equipment.name, " - $", equipment.price, "/day"] }, equipment.id))) })] }), _jsx(Button, { onClick: addEquipment, disabled: !selectedEquipment, children: _jsx(Plus, { className: "h-4 w-4" }) })] }), bookingItems.length > 0 && (_jsx("div", { className: "space-y-2", children: bookingItems.map((item) => (_jsx(Card, { children: _jsx(CardContent, { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: item.equipment_name }), _jsxs(Badge, { variant: "outline", className: "ml-2", children: ["$", item.equipment_price || 0, "/day"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => updateQuantity(item.equipment_id, -1), children: _jsx(Minus, { className: "h-3 w-3" }) }), _jsx("span", { className: "mx-2 font-medium", children: item.quantity }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => updateQuantity(item.equipment_id, 1), children: _jsx(Plus, { className: "h-3 w-3" }) }), _jsx(Button, { size: "sm", variant: "destructive", onClick: () => removeItem(item.equipment_id), children: _jsx(X, { className: "h-3 w-3" }) })] })] }) }) }, item.equipment_id))) }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "discount", children: "Discount ($)" }), _jsx(Input, { id: "discount", type: "number", min: "0", max: calculateSubtotal(), value: discount, onChange: (e) => setDiscount(Math.max(0, Math.min(calculateSubtotal(), Number(e.target.value)))), placeholder: "Enter discount amount" })] }), startDate && endDate && bookingItems.length > 0 && (_jsxs("div", { className: "border-t pt-4 space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { children: "Subtotal:" }), _jsxs("span", { children: ["$", calculateSubtotal().toFixed(2)] })] }), discount > 0 && (_jsxs("div", { className: "flex justify-between items-center text-red-600", children: [_jsx("span", { children: "Discount:" }), _jsxs("span", { children: ["-$", discount.toFixed(2)] })] })), _jsxs("div", { className: "flex justify-between items-center text-lg font-bold border-t pt-2", children: [_jsx("span", { children: "Total Amount:" }), _jsxs("span", { children: ["$", calculateTotal().toFixed(2)] })] })] })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", onClick: onClose, className: "flex-1", children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, disabled: loading, className: "flex-1", children: loading ? 'Updating...' : 'Update Booking' })] })] })] }) }));
};
