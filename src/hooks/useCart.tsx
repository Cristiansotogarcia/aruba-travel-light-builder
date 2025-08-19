import { createContext, useContext, useState, ReactNode } from 'react';
import { Product, BookingItem } from '@/types/types';
import { useToast } from '@/components/ui/use-toast';

interface CartContextType {
  items: BookingItem[];
  addItem: (equipment: Product, quantity: number, selectedDate?: Date) => void;
  removeItem: (equipmentId: string) => void;
  updateItemQuantity: (equipmentId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<BookingItem[]>([]);
  const { toast } = useToast();

  const addItem = (equipment: Product, quantity: number, selectedDate?: Date) => {
    if (!selectedDate) {
      toast({
        title: 'Date Not Selected',
        description: 'Please select a date before adding equipment.',
        variant: 'destructive',
      });
      return;
    }

    if (equipment.stock_quantity < quantity) {
      toast({
        title: 'Insufficient Stock',
        description: `Only ${equipment.stock_quantity} units of ${equipment.name} available.`,
        variant: 'destructive',
      });
      return;
    }

    setItems(prev => {
      const existing = prev.find(item => item.equipment_id === equipment.id);
      if (existing) {
        if (equipment.stock_quantity < existing.quantity + quantity) {
          toast({
            title: 'Insufficient Stock for Cart Update',
            description: `Cannot add ${quantity} more unit(s) of ${equipment.name}. Available: ${equipment.stock_quantity}, In cart: ${existing.quantity}.`,
            variant: 'destructive',
          });
          return prev;
        }
        return prev.map(item =>
          item.equipment_id === equipment.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                subtotal: (item.quantity + quantity) * item.equipment_price,
              }
            : item
        );
      }

      const price = equipment.price_per_day ?? 0;
      const newItem: BookingItem = {
        equipment_id: equipment.id,
        quantity,
        equipment_price: price,
        equipment_name: equipment.name,
        subtotal: price * quantity,
      };
      return [...prev, newItem];
    });
  };

  const removeItem = (equipmentId: string) => {
    setItems(prev => prev.filter(item => item.equipment_id !== equipmentId));
  };

  const updateItemQuantity = (equipmentId: string, quantity: number) => {
    if (isNaN(quantity)) return;
    setItems(prev =>
      prev.map(item =>
        item.equipment_id === equipmentId
          ? { ...item, quantity, subtotal: quantity * item.equipment_price }
          : item
      )
    );
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default useCart;
