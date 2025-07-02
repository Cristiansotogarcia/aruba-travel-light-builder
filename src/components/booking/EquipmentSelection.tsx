
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import React from 'react';
import { Product, BookingItem } from '@/types/types'; // Import Product and BookingItem from types.ts
import Spinner from '@/components/common/Spinner'; // Added Spinner import

interface EquipmentSelectionProps {
  products: Product[];
  selectedEquipment: string;
  setSelectedEquipment: (id: string) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  addEquipment: (equipment: Product, quantity: number, selectedDate: Date | undefined) => void; // Updated signature
  bookingItems: BookingItem[];
  removeEquipment: (equipment_id: string) => void;
  currentSelectedDate?: Date | undefined; // Added prop for selected date
}

const EquipmentSelection: React.FC<EquipmentSelectionProps> = ({
  products,
  selectedEquipment,
  setSelectedEquipment,
  quantity,
  setQuantity,
  addEquipment,
  bookingItems,
  removeEquipment,
  currentSelectedDate // Destructure new prop
}) => {
  const selectedProductDetails = products.find(p => p.id === selectedEquipment);

  const handleAddEquipment = () => {
    if (selectedProductDetails && quantity > 0) {
      addEquipment(selectedProductDetails, quantity, currentSelectedDate); // Pass currentSelectedDate
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Equipment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="equipment">Equipment</Label>
            {products.length === 0 ? (
              <div className="flex items-center justify-center h-10 border border-gray-300 rounded-md">
                <Spinner size="sm" message="Loading equipment..." />
              </div>
            ) : (
              <select
                id="equipment"
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select equipment...</option>
                {products.map(equipment => (
                  <option key={equipment.id} value={equipment.id} disabled={equipment.stock_quantity <= 0}>
                    {equipment.name} - ${equipment.price_per_day}/day | ${Number(equipment.price_per_day * 5).toFixed(2)}/week
                    {equipment.availability_status === 'Out of Stock' ? ' (Out of Stock)' :
                     equipment.availability_status === 'Low Stock' ? ` (Low Stock: ${equipment.stock_quantity} left)` : ''}
                    {/* Fallback for safety, though availability_status should be set */}
                    {!equipment.availability_status && equipment.stock_quantity <= 0 ? ' (Out of stock)' : 
                     !equipment.availability_status && equipment.stock_quantity < 5 && equipment.stock_quantity > 0 ? ` (Low stock: ${equipment.stock_quantity} left)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
            />
          </div>
        </div>
        <Button 
          type="button" 
          onClick={handleAddEquipment} // Changed to call internal handler
          disabled={!selectedEquipment || !selectedProductDetails || (selectedProductDetails && selectedProductDetails.stock_quantity < quantity) || (selectedProductDetails && selectedProductDetails.stock_quantity <= 0)}
        >
          Add to Booking
        </Button>

        {/* Selected Equipment List */}
        {bookingItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Equipment:</h4>
            {bookingItems.map(item => {
              const equipmentDetails = products.find(eq => eq.id === item.equipment_id);
              return item.equipment_name && equipmentDetails ? ( // Ensure equipmentDetails is found
                <div key={item.equipment_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <img 
                      src={equipmentDetails.image_url || undefined} // Use image_url from found product
                      alt={item.equipment_name}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <div>
                      <p className="font-medium">{item.equipment_name}</p>
                      <p className="text-sm text-gray-600">
                          Quantity: {item.quantity} × ${item.equipment_price}/day |
                          ${Number(item.equipment_price * 5).toFixed(2)}/week {/* Use equipment_price from BookingItem */}
                        </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEquipment(item.equipment_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentSelection; // Added export statement
