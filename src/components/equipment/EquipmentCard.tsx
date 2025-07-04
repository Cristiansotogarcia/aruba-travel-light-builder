import { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import clsx from 'clsx';
import DOMPurify from 'dompurify';

interface Equipment {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
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

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col justify-between">
        <div className="aspect-square relative overflow-hidden">
          <img
            src={equipment.image}
            alt={equipment.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
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

        <CardHeader>
          <CardTitle className="text-lg">{equipment.name}</CardTitle>
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

          <img
            src={equipment.image}
            alt={equipment.name}
            className="w-full h-64 object-cover rounded mb-4"
          />

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
