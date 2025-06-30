import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx'; // Changed to relative path with .tsx extension
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import Spinner from '@/components/common/Spinner'; // Added Spinner import
const EquipmentSelection = ({ products, selectedEquipment, setSelectedEquipment, quantity, setQuantity, addEquipment, bookingItems, removeEquipment, currentSelectedDate // Destructure new prop
 }) => {
    const selectedProductDetails = products.find(p => p.id === selectedEquipment);
    const handleAddEquipment = () => {
        if (selectedProductDetails && quantity > 0) {
            addEquipment(selectedProductDetails, quantity, currentSelectedDate); // Pass currentSelectedDate
        }
    };
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Select Equipment" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx(Label, { htmlFor: "equipment", children: "Equipment" }), products.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-10 border border-gray-300 rounded-md", children: _jsx(Spinner, { size: "sm", message: "Loading equipment..." }) })) : (_jsxs("select", { id: "equipment", value: selectedEquipment, onChange: (e) => setSelectedEquipment(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md", children: [_jsx("option", { value: "", children: "Select equipment..." }), products.map(equipment => (_jsxs("option", { value: equipment.id, disabled: equipment.stock_quantity <= 0, children: [equipment.name, " - $", equipment.price_per_day, "/day", equipment.availability_status === 'Out of Stock' ? ' (Out of Stock)' :
                                                        equipment.availability_status === 'Low Stock' ? ` (Low Stock: ${equipment.stock_quantity} left)` : '', !equipment.availability_status && equipment.stock_quantity <= 0 ? ' (Out of stock)' :
                                                        !equipment.availability_status && equipment.stock_quantity < 5 && equipment.stock_quantity > 0 ? ` (Low stock: ${equipment.stock_quantity} left)` : ''] }, equipment.id)))] }))] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "quantity", children: "Quantity" }), _jsx(Input, { id: "quantity", type: "number", min: "1", value: quantity, onChange: (e) => setQuantity(parseInt(e.target.value)) })] })] }), _jsx(Button, { type: "button", onClick: handleAddEquipment, disabled: !selectedEquipment || !selectedProductDetails || (selectedProductDetails && selectedProductDetails.stock_quantity < quantity) || (selectedProductDetails && selectedProductDetails.stock_quantity <= 0), children: "Add to Booking" }), bookingItems.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "font-medium", children: "Selected Equipment:" }), bookingItems.map(item => {
                                const equipmentDetails = products.find(eq => eq.id === item.equipment_id);
                                return item.equipment_name && equipmentDetails ? ( // Ensure equipmentDetails is found
                                _jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: equipmentDetails.image_url || undefined, alt: item.equipment_name, className: "w-12 h-12 object-cover rounded", onError: (e) => (e.currentTarget.style.display = 'none') }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: item.equipment_name }), _jsxs("p", { className: "text-sm text-gray-600", children: ["Quantity: ", item.quantity, " \u00D7 $", item.equipment_price, "/day "] })] })] }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => removeEquipment(item.equipment_id), children: _jsx(Trash2, { className: "h-4 w-4" }) })] }, item.equipment_id)) : null;
                            })] }))] })] }));
};
export default EquipmentSelection; // Added export statement
