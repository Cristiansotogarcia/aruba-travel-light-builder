
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative overflow-hidden">
        <img 
          src={equipment.image} 
          alt={equipment.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2">
          {equipment.availability !== 'unavailable' && (
            <Badge className={getAvailabilityColor(equipment.availability)}>
              {getAvailabilityText(equipment.availability)}
            </Badge>
          )}
        </div>
      </div>
      
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{equipment.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {equipment.category}
          </Badge>
        </div>
        <p
          className="text-gray-600 text-sm"
          dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
        />
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-primary">
              {`$${equipment.price.toFixed(2)}/day | $${
                Number(equipment.price * 5).toFixed(2)
              }/week`}
            </span>
          </div>
          
          {equipment.features.length > 0 && (
            <div className="space-y-1">
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
        {/* Keep booking button in code but hide until feature launch */}
        <Link to="/book" className="w-full hidden" hidden>
          <Button
            className="w-full"
            disabled={equipment.availability === 'unavailable'}
          >
            {'Book Now'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
