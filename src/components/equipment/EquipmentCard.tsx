import { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import clsx from 'clsx';
import DOMPurify from 'dompurify';
import { Share2, ShoppingCart } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useCart } from '@/hooks/useCart';
import type { AvailabilityStatus, Product } from '@/types/types';

interface Equipment {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  price_per_week?: number;
  image: string;

  images: string[];
  description: string;
  availability: 'available' | 'limited' | 'unavailable';
  availability_status?: AvailabilityStatus;
  features: string[];
  stock_quantity: number;
}

interface EquipmentCardProps {
  equipment: Equipment;
}

export const EquipmentCard = ({ equipment }: EquipmentCardProps) => {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const sanitizedDescription = useMemo(
    () => DOMPurify.sanitize(equipment.description),
    [equipment.description]
  );

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-emerald-100 text-emerald-700';
      case 'limited':
        return 'bg-amber-100 text-amber-700';
      case 'unavailable':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'Available';
      case 'limited':
        return 'Limited Stock';
      case 'unavailable':
        return 'Out of Stock';
      default:
        return 'Unknown';
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/equipment/${equipment.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: equipment.name, url });
        return;
      } catch {
        // fall back to clipboard on share failure
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied' });
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handleQuantityChange = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      setQuantity(1);
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), equipment.stock_quantity || 1);
    setQuantity(clamped);
  };

  const handleAddToCart = () => {
    if (equipment.stock_quantity <= 0) return;
    const product: Product = {
      id: equipment.id,
      name: equipment.name,
      description: equipment.description,
      price_per_day: equipment.price,
      price_per_week: equipment.price_per_week,
      category: equipment.category,
      images: equipment.images,
      stock_quantity: equipment.stock_quantity,
      availability_status: equipment.availability_status,
    };
    addItem(product, quantity);
    toast({ title: 'Added to cart', description: `${quantity} × ${equipment.name}` });
  };

  return (
    <>
      <Card className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-soft h-full flex flex-col justify-between">
        <Link to={`/equipment/${equipment.slug}`}>
          <div className="aspect-[4/3] relative overflow-hidden">
            {equipment.images[0] && (
              <img
                src={equipment.images[0]}
                alt={equipment.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute top-3 left-3">
              {equipment.availability !== 'unavailable' &&
                equipment.availability_status !== 'Temporarily Not Available' && (
                  <div
                    className={clsx(
                      'text-xs font-semibold px-3 py-1 rounded-full bg-white/90 shadow-sm',
                      getAvailabilityColor(equipment.availability)
                    )}
                  >
                    {getAvailabilityText(equipment.availability)}
                  </div>
                )}
            </div>
          </div>
        </Link>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">
              <Link to={`/equipment/${equipment.slug}`} className="hover:underline">
                {equipment.name}
              </Link>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              aria-label="Share"
              className="text-muted-foreground hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-muted-foreground text-sm line-clamp-2">
            <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
          </div>

          <button
            onClick={() => setOpen(true)}
            className="text-xs text-primary mt-1 hover:underline"
          >
            Read more
          </button>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-2">
            {equipment.availability_status === 'Temporarily Not Available' ? (
              <div className="flex items-center">
                <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Temporarily Not Available
                </span>
              </div>
            ) : (
              <div className="flex gap-2 items-center flex-wrap">
                <span className="bg-[#00ADEF] text-white px-3 py-1 rounded-full text-xs font-semibold">
                  ${equipment.price.toFixed(2)}/day
                </span>
                <span className="bg-[#F7931E] text-white px-3 py-1 rounded-full text-xs font-semibold">
                  ${Number(equipment.price * 5).toFixed(2)}/week
                </span>
              </div>
            )}

            {equipment.features.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-sm font-medium text-foreground">Features:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {equipment.features.slice(0, 3).map((feature, index) => (
                    <li key={index}>- {feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter>
          {equipment.availability_status === 'Temporarily Not Available' ? (
            <div className="w-full"></div>
          ) : (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2">
                <label htmlFor={`qty-${equipment.id}`} className="text-xs text-muted-foreground">
                  Qty
                </label>
                <Input
                  id={`qty-${equipment.id}`}
                  type="number"
                  min={1}
                  max={equipment.stock_quantity || 1}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-20"
                  disabled={equipment.availability === 'unavailable'}
                />
                <span className="text-xs text-muted-foreground">
                  {equipment.stock_quantity} in stock
                </span>
              </div>
              <Button
                className="w-full"
                disabled={equipment.availability === 'unavailable' || equipment.stock_quantity <= 0}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto [&>button]:h-11 [&>button]:w-11 [&>button]:min-h-[44px] [&>button]:min-w-[44px] [&>button]:top-2 [&>button]:right-2 [&>button]:z-10 w-[95vw] sm:w-auto h-[95vh] sm:h-auto border border-border/60 bg-card/95 shadow-2xl">
          <div className="sticky top-0 bg-card/95 border-b border-border/60 -mx-6 -mt-6 px-6 py-4 z-30 flex items-center justify-between backdrop-blur">
            <DialogTitle className="text-base sm:text-lg font-semibold truncate pr-4">
              {equipment.name}
            </DialogTitle>
            <button
              onClick={() => setOpen(false)}
              className="flex-shrink-0 bg-muted/70 hover:bg-muted rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pt-4">
            {equipment.images.length > 0 ? (
              <Carousel className="w-full mb-4">
                <CarouselContent>
                  {equipment.images.map((img, idx) => (
                    <CarouselItem key={idx}>
                      <img
                        src={img}
                        alt={`${equipment.name} image ${idx + 1}`}
                        className="w-full h-64 object-cover rounded-2xl"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            ) : (
              <img
                src={equipment.image}
                alt={equipment.name}
                className="w-full h-64 object-cover rounded-2xl mb-4"
              />
            )}

            <div className="text-sm text-muted-foreground whitespace-pre-line mb-4">
              <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
            </div>

            <div className="text-sm mb-4">
              {equipment.availability_status === 'Temporarily Not Available' ? (
                <span className="font-semibold">
                  Status:{' '}
                  <span className="bg-rose-500 text-white px-2 py-1 rounded-full text-xs font-semibold ml-1">
                    Temporarily Not Available
                  </span>
                </span>
              ) : (
                <>
                  <span className="font-semibold">Price:</span>{' '}
                  ${equipment.price.toFixed(2)}/day | ${Number(equipment.price * 5).toFixed(2)}/week
                </>
              )}
            </div>

            {equipment.features.length > 0 && (
              <div className="text-sm">
                <p className="font-medium">Features:</p>
                <ul className="list-disc list-inside pl-1 text-muted-foreground">
                  {equipment.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-border/60">
              <Button onClick={() => setOpen(false)} variant="outline" className="min-h-[44px]">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EquipmentCard;
