import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Cart = () => {
  const { items, removeItem, updateItemQuantity } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="h-24 w-24 text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">Your cart is empty</p>
          <Button 
            className="mt-6" 
            onClick={() => navigate('/equipment')}
          >
            Browse Equipment
          </Button>
        </CardContent>
      </Card>
    );
  }

  const calculateSubtotal = (item: typeof items[0]) => {
    return item.equipment_price * item.quantity;
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + calculateSubtotal(item), 0);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cart Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map(item => (
              <div key={item.equipment_id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-lg">{item.equipment_name}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Qty:</label>
                      <Input
                        type="number"
                        min="1"
                        className="w-20"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.equipment_id, parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      ${item.equipment_price.toFixed(2)}/day
                    </div>
                    <div className="text-sm font-medium">
                      Subtotal: ${calculateSubtotal(item).toFixed(2)}/day
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeItem(item.equipment_id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Quantity:</span>
                <span className="font-medium">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Estimated Total:</span>
                  <span className="text-primary">${calculateTotal().toFixed(2)}/day</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  * Final price will be calculated based on rental duration
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate('/book')}
            >
              Proceed to Booking
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/equipment')}
            >
              Continue Shopping
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Cart;
