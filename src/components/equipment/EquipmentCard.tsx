import { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import clsx from 'clsx';
import DOMPurify from 'dompurify';
import { Share2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Equipment {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  image: string;

  images: string[];
  description: string;
  availability: 'available' | 'limited' | 'unavailable';
  features: string[];
}

interface EquipmentCardProps {
  equipment: Equipment;
}

export const EquipmentCard = ({ equipment }: EquipmentCardProps) => {
  const [open, setOpen] = useState(false);

  const sanitizedDescription = useMemo(
    () => DOMPurify.sanitize(equipment.description),
    [equipment.description]
  );

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'limited':
        return 'bg-yellow-100 text-yellow-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
      <>
        <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col justify-between">
          <Link to={`/equipment/${equipment.slug}`}>
            <div className="relative overflow-hidden flex items-center justify-center">
              {equipment.images[0] && (
                <img
                  src={equipment.images[0]}
                  alt={equipment.name}
                  className="w-full h-auto object-contain hover:scale-105 transition-transform duration-300"
                />
              )}
              <div className="absolute top-2 right-2">
              {equipment.availability !== 'unavailable' && (
                <div
                  className={clsx(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    getAvailabilityColor(equipment.availability)
                  )}
                >
                  {getAvailabilityText(equipment.availability)}
                </div>
              )}
            </div>
          </div>
        </Link>

        <CardHeader>
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
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-gray-600 text-sm line-clamp-2">
            <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
          </div>

          <button
            onClick={() => setOpen(true)}
            className="text-xs text-blue-600 mt-1 hover:underline"
          >
            Read more
          </button>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="bg-[#00ADEF] text-white px-3 py-1 rounded-md text-sm font-semibold">
                ${equipment.price.toFixed(2)}/day
              </span>
              <span className="bg-[#F7931E] text-white px-3 py-1 rounded-md text-sm font-semibold">
                ${Number(equipment.price * 5).toFixed(2)}/week
              </span>
            </div>

            {equipment.features.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-sm font-medium text-gray-700">Features:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {equipment.features.slice(0, 3).map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Link to="/book" className="w-full hidden" hidden>
            <Button
              className="w-full"
              disabled={equipment.availability === 'unavailable'}
            >
              Book Now
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* 🔵 MODAL */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{equipment.name}</DialogTitle>
            </DialogHeader>

            {equipment.images.length > 0 ? (
              <Carousel className="w-full mb-4">
                <CarouselContent>
                  {equipment.images.map((img, idx) => (
                    <CarouselItem key={idx}>
                      <img
                        src={img}
                        alt={`${equipment.name} image ${idx + 1}`}
                        className="w-full h-auto max-h-96 object-contain rounded"
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
                className="w-full h-auto max-h-96 object-contain rounded mb-4"
              />
            )}

          <div className="text-sm text-gray-700 whitespace-pre-line mb-2">
            <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
          </div>

          <div className="text-sm mb-4">
            <span className="font-semibold">Price:</span>{' '}
            ${equipment.price.toFixed(2)}/day | ${Number(equipment.price * 5).toFixed(2)}/week
          </div>

          {equipment.features.length > 0 && (
            <div className="text-sm">
              <p className="font-medium">Features:</p>
              <ul className="list-disc list-inside pl-1">
                {equipment.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EquipmentCard;
