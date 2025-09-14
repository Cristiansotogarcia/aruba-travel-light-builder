
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertCircle, Package, ShoppingCart } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Product } from '@/types/types'; // Import Product from types.ts
import Spinner from '@/components/common/Spinner'; // Added Spinner import
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface EquipmentSelectionProps {
  products: Product[];
  selectedEquipment: string;
  setSelectedEquipment: (id: string) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  currentSelectedDate?: Date | undefined; // Added prop for selected date
}

interface ValidationError {
  field: string;
  message: string;
}

const EquipmentSelection: React.FC<EquipmentSelectionProps> = ({
  products,
  selectedEquipment,
  setSelectedEquipment,
  quantity,
  setQuantity,
  currentSelectedDate // Destructure new prop
}) => {
  const { items: bookingItems, addItem, removeItem, updateItemQuantity } = useCart();
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const selectedProductDetails = products.find(p => p.id === selectedEquipment);
  const availableProducts = products.filter(p => p.stock_quantity > 0);
  const outOfStockProducts = products.filter(p => p.stock_quantity <= 0);

  // Validation functions
  const validateSelection = (): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    if (!selectedEquipment) {
      validationErrors.push({
        field: 'equipment',
        message: 'Please select equipment'
      });
    }

    if (!selectedProductDetails) {
      validationErrors.push({
        field: 'equipment',
        message: 'Selected equipment is not available'
      });
    }

    if (quantity <= 0) {
      validationErrors.push({
        field: 'quantity',
        message: 'Quantity must be at least 1'
      });
    }

    if (selectedProductDetails && quantity > selectedProductDetails.stock_quantity) {
      validationErrors.push({
        field: 'quantity',
        message: `Only ${selectedProductDetails.stock_quantity} units available`
      });
    }

    if (selectedProductDetails && selectedProductDetails.stock_quantity <= 0) {
      validationErrors.push({
        field: 'equipment',
        message: 'Selected equipment is out of stock'
      });
    }

    // Check if equipment is already in cart
    const existingItem = bookingItems.find(item => item.equipment_id === selectedEquipment);
    if (existingItem && selectedProductDetails) {
      const totalQuantity = existingItem.quantity + quantity;
      if (totalQuantity > selectedProductDetails.stock_quantity) {
        validationErrors.push({
          field: 'quantity',
          message: `Total quantity would exceed available stock (${selectedProductDetails.stock_quantity} available, ${existingItem.quantity} already in cart)`
        });
      }
    }

    return validationErrors;
  };

  const handleAddEquipment = async () => {
    setIsLoading(true);
    const validationErrors = validateSelection();
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the errors before adding equipment');
      setIsLoading(false);
      return;
    }

    try {
      if (selectedProductDetails && quantity > 0) {
        addItem(selectedProductDetails, quantity, currentSelectedDate);
        toast.success(`Added ${quantity} ${selectedProductDetails.name} to booking`);
        
        // Reset selection after successful add
        setSelectedEquipment('');
        setQuantity(1);
        setErrors([]);
      }
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast.error('Failed to add equipment to booking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      setQuantity(1);
      return;
    }
    
    if (selectedProductDetails && newQuantity > selectedProductDetails.stock_quantity) {
      toast.warning(`Only ${selectedProductDetails.stock_quantity} units available`);
      setQuantity(selectedProductDetails.stock_quantity);
      return;
    }
    
    setQuantity(newQuantity);
  };

  const handleEquipmentChange = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setErrors([]);
    
    // Reset quantity if new equipment has less stock than current quantity
    const newProduct = products.find(p => p.id === equipmentId);
    if (newProduct && quantity > newProduct.stock_quantity) {
      setQuantity(Math.min(quantity, newProduct.stock_quantity));
    }
  };

  const handleRemoveItem = (equipmentId: string) => {
    try {
      const item = bookingItems.find(item => item.equipment_id === equipmentId);
      removeItem(equipmentId);
      if (item) {
        toast.success(`Removed ${item.equipment_name} from booking`);
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item from booking');
    }
  };

  const handleUpdateQuantity = (equipmentId: string, newQuantity: number) => {
    try {
      const equipment = products.find(p => p.id === equipmentId);
      
      if (!equipment) {
        toast.error('Equipment not found');
        return;
      }
      
      if (newQuantity < 1) {
        toast.warning('Quantity must be at least 1');
        return;
      }
      
      if (newQuantity > equipment.stock_quantity) {
        toast.warning(`Only ${equipment.stock_quantity} units available`);
        return;
      }
      
      updateItemQuantity(equipmentId, newQuantity);
      toast.success('Quantity updated');
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  // Clear errors when selection changes
  useEffect(() => {
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [selectedEquipment, quantity]);

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  const hasErrors = errors.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Select Equipment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please correct the following errors:
              <ul className="list-disc list-inside mt-2">
                {errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {outOfStockProducts.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {outOfStockProducts.length} equipment item(s) are currently out of stock.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="equipment" className={getFieldError('equipment') ? 'text-destructive' : ''}>
              Equipment *
            </Label>
            {products.length === 0 ? (
              <div className="flex items-center justify-center h-10 border border-gray-300 rounded-md">
                <Spinner size="sm" message="Loading equipment..." />
              </div>
            ) : (
              <select
                id="equipment"
                value={selectedEquipment}
                onChange={(e) => handleEquipmentChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  getFieldError('equipment') ? 'border-destructive focus:border-destructive' : 'border-gray-300'
                }`}
              >
                <option value="">Select equipment...</option>
                {availableProducts.length > 0 && (
                  <optgroup label="Available Equipment">
                    {availableProducts.map(equipment => (
                      <option key={equipment.id} value={equipment.id}>
                        {equipment.name} - ${equipment.price_per_day}/day | ${Number(equipment.price_per_day * 5).toFixed(2)}/week
                        {equipment.stock_quantity < 5 ? ` (${equipment.stock_quantity} left)` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {outOfStockProducts.length > 0 && (
                  <optgroup label="Out of Stock">
                    {outOfStockProducts.map(equipment => (
                      <option key={equipment.id} value={equipment.id} disabled>
                        {equipment.name} - Out of Stock
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
            {getFieldError('equipment') && (
              <p className="text-sm text-destructive mt-1">{getFieldError('equipment')}</p>
            )}
          </div>
          <div>
            <Label htmlFor="quantity" className={getFieldError('quantity') ? 'text-destructive' : ''}>
              Quantity *
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedProductDetails?.stock_quantity || 999}
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              placeholder="1"
              className={getFieldError('quantity') ? 'border-destructive focus:border-destructive' : ''}
            />
            {getFieldError('quantity') && (
              <p className="text-sm text-destructive mt-1">{getFieldError('quantity')}</p>
            )}
            {selectedProductDetails && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProductDetails.stock_quantity} available
              </p>
            )}
          </div>
        </div>
        
        {selectedProductDetails && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {selectedProductDetails.images?.[0] && (
                <img
                  src={selectedProductDetails.images[0]}
                  alt={selectedProductDetails.name}
                  className="w-16 h-16 object-cover rounded"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium">{selectedProductDetails.name}</h4>
                <p className="text-sm text-muted-foreground">{selectedProductDetails.description}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm font-medium">
                    ${selectedProductDetails.price_per_day}/day
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ${Number(selectedProductDetails.price_per_day * 5).toFixed(2)}/week
                  </span>
                  <span className={`text-sm ${
                    selectedProductDetails.stock_quantity < 5 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {selectedProductDetails.stock_quantity} in stock
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Button 
          type="button" 
          onClick={handleAddEquipment}
          disabled={isLoading || !selectedEquipment || !selectedProductDetails || quantity <= 0}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
              Adding...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Booking
            </>
          )}
        </Button>

        {/* Selected Equipment List */}
        {bookingItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <h4 className="font-medium">Selected Equipment ({bookingItems.length} item{bookingItems.length !== 1 ? 's' : ''})</h4>
            </div>
            <div className="space-y-3">
              {bookingItems.map(item => {
                const equipmentDetails = products.find(eq => eq.id === item.equipment_id);
                const isLowStock = equipmentDetails && equipmentDetails.stock_quantity < 5;
                const isOutOfStock = equipmentDetails && equipmentDetails.stock_quantity <= 0;
                
                return item.equipment_name && equipmentDetails ? (
                  <div key={item.equipment_id} className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                    <div className="flex items-center gap-3 flex-1">
                      {equipmentDetails.images?.[0] && (
                        <img
                          src={equipmentDetails.images[0]}
                          alt={item.equipment_name}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.equipment_name}</p>
                          {isOutOfStock && (
                            <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded">
                              Out of Stock
                            </span>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                              Low Stock
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`quantity-${item.equipment_id}`} className="text-sm">
                              Qty:
                            </Label>
                            <Input
                              id={`quantity-${item.equipment_id}`}
                              type="number"
                              min="1"
                              max={equipmentDetails.stock_quantity}
                              className="w-20"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(item.equipment_id, parseInt(e.target.value) || 1)
                              }
                              disabled={isOutOfStock}
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">
                              ${item.equipment_price}/day
                            </span>
                            <span className="mx-2">|</span>
                            <span>
                              ${Number(item.equipment_price * 5).toFixed(2)}/week
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Subtotal: ${(item.equipment_price * item.quantity).toFixed(2)}/day
                          </div>
                        </div>
                        {equipmentDetails && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {equipmentDetails.stock_quantity} available in stock
                          </p>
                        )}
                        {item.quantity > equipmentDetails.stock_quantity && (
                          <p className="text-xs text-destructive mt-1">
                            ⚠️ Quantity exceeds available stock
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.equipment_id)}
                      className="ml-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null;
              })}
            </div>
            
            {/* Booking Summary */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Daily Rate:</span>
                <span className="font-bold text-lg">
                  ${bookingItems.reduce((total, item) => total + (item.equipment_price * item.quantity), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                <span>Weekly Rate:</span>
                <span>
                  ${bookingItems.reduce((total, item) => total + (item.equipment_price * item.quantity * 5), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentSelection; // Added export statement
