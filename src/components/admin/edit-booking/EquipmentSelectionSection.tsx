
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, X } from 'lucide-react';
import { mockEquipment } from '@/data/mockEquipment';
import { BookingItem } from '@/components/admin/calendar/types';

interface EquipmentSelectionSectionProps {
  selectedEquipment: string;
  bookingItems: BookingItem[];
  onSelectedEquipmentChange: (equipmentId: string) => void;
  onAddEquipment: () => void;
  onUpdateQuantity: (equipmentId: string, change: number) => void;
  onRemoveItem: (equipmentId: string) => void;
}

export const EquipmentSelectionSection = ({
  selectedEquipment,
  bookingItems,
  onSelectedEquipmentChange,
  onAddEquipment,
  onUpdateQuantity,
  onRemoveItem
}: EquipmentSelectionSectionProps) => {
  return (
    <div className="space-y-3">
      <h3 className="font-medium">Equipment</h3>
      <div className="flex gap-2">
        <Select value={selectedEquipment} onValueChange={onSelectedEquipmentChange}>
          <SelectTrigger className="flex-1 h-8">
            <SelectValue placeholder="Select equipment" />
          </SelectTrigger>
          <SelectContent>
            {mockEquipment.map((equipment) => (
              <SelectItem key={equipment.id} value={equipment.id}>
                {equipment.name} - ${equipment.price}/day
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onAddEquipment} disabled={!selectedEquipment} size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected Equipment Items */}
      {bookingItems.length > 0 && (
        <div className="space-y-2">
          {bookingItems.map((item) => (
            <div key={item.equipment_id} className="flex items-center justify-between p-2 border rounded text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.equipment_name}</span>
                <Badge variant="outline" className="text-xs">
                  ${item.equipment_price}/day
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateQuantity(item.equipment_id, -1)}
                  className="h-6 w-6 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateQuantity(item.equipment_id, 1)}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onRemoveItem(item.equipment_id)}
                  className="h-6 w-6 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
