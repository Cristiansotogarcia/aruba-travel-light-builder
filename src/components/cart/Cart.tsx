import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';

const Cart = () => {
  const { items, removeItem, updateItemQuantity } = useCart();

  if (items.length === 0) {
    return <p>Your cart is empty.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.equipment_id} className="flex items-center justify-between p-4 border rounded">
          <div>
            <p className="font-medium">{item.equipment_name}</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Input
                type="number"
                min="1"
                className="w-16"
                value={item.quantity}
                onChange={(e) => updateItemQuantity(item.equipment_id, parseInt(e.target.value))}
              />
              <span>
                × ${item.equipment_price}/day | ${Number(item.equipment_price * 5).toFixed(2)}/week
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeItem(item.equipment_id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default Cart;
