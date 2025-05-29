
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { mockEquipment } from '@/data/mockEquipment';

interface BookingItem {
  equipmentId: string;
  quantity: number;
}

interface EquipmentSelectionProps {
  selectedEquipment: string;
  quantity: number;
  bookingItems: BookingItem[];
  onEquipmentChange: (equipmentId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onAddEquipment: () => void;
  onRemoveEquipment: (equipmentId: string) => void;
}

export const EquipmentSelection = ({
  selectedEquipment,
  quantity,
  bookingItems,
  onEquipmentChange,
  onQuantityChange,
  onAddEquipment,
  onRemoveEquipment
}: EquipmentSelectionProps) => {
  const availableEquipment = mockEquipment.filter(eq => eq.availability !== 'unavailable');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Equipment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="equipment">Equipment</Label>
            <select
              id="equipment"
              value={selectedEquipment}
              onChange={(e) => onEquipmentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select equipment...</option>
              {availableEquipment.map(equipment => (
                <option key={equipment.id} value={equipment.id}>
                  {equipment.name} - ${equipment.price}/day
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => onQuantityChange(parseInt(e.target.value))}
            />
          </div>
        </div>
        <Button type="button" onClick={onAddEquipment} disabled={!selectedEquipment}>
          Add to Booking
        </Button>

        {/* Selected Equipment List */}
        {bookingItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Equipment:</h4>
            {bookingItems.map(item => {
              const equipment = mockEquipment.find(eq => eq.id === item.equipmentId);
              return equipment ? (
                <div key={item.equipmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <img 
                      src={equipment.image} 
                      alt={equipment.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{equipment.name}</p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} × ${equipment.price}/day
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveEquipment(item.equipmentId)}
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
