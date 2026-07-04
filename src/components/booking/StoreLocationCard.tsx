import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, Store } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export const StoreLocationCard = () => {
  const { getSetting } = useSystemSettings();

  const storeName = getSetting('store_name', 'Our Store');
  const storeAddress = getSetting('store_address', '');
  const storeHours = getSetting('store_hours', '');

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-5 w-5 text-primary" />
          Collect &amp; return at our store
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {storeName && (
          <p className="font-medium">{storeName}</p>
        )}
        {storeAddress && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{storeAddress}</span>
          </div>
        )}
        {storeHours && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{storeHours}</span>
          </div>
        )}
        <p className="text-green-700 font-medium pt-1">No delivery fee for store pickup.</p>
      </CardContent>
    </Card>
  );
};
