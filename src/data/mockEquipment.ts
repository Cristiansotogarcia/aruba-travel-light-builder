
export interface Equipment {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  availability: 'available' | 'limited' | 'unavailable';
  features: string[];
}

export const mockEquipment: Equipment[] = [
  // Beach Equipment
  {
    id: '1',
    name: 'Premium Beach Umbrella',
    category: 'Beach Equipment',
    price: 15,
    image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21',
    description: 'Large UV-protection umbrella perfect for family beach days',
    availability: 'available',
    features: ['UV Protection', 'Wind Resistant', '8ft Diameter', 'Easy Setup']
  },
  {
    id: '2',
    name: 'Beach Chair Set (2)',
    category: 'Beach Equipment',
    price: 20,
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
    description: 'Comfortable reclining beach chairs for two people',
    availability: 'available',
    features: ['Reclining', 'Cup Holders', 'Lightweight', 'Foldable']
  },
  {
    id: '3',
    name: 'Premium Cooler (48qt)',
    category: 'Beach Equipment',
    price: 25,
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96',
    description: 'Large insulated cooler keeps drinks cold all day',
    availability: 'limited',
    features: ['48 Quart Capacity', '5-Day Ice Retention', 'Wheels', 'Bottle Opener']
  },
  {
    id: '4',
    name: 'Snorkel Gear Set',
    category: 'Beach Equipment',
    price: 18,
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
    description: 'Complete snorkeling set with mask, snorkel, and fins',
    availability: 'available',
    features: ['Anti-Fog Mask', 'Dry Snorkel', 'Adjustable Fins', 'Mesh Bag']
  },

  // Baby Equipment
  {
    id: '5',
    name: 'All-Terrain Stroller',
    category: 'Baby Equipment',
    price: 35,
    image: 'https://images.unsplash.com/photo-1721322800607-8c38375eef04',
    description: 'Rugged stroller perfect for beach and city exploring',
    availability: 'available',
    features: ['All-Terrain Wheels', 'Sun Canopy', 'Storage Basket', 'Reclining Seat']
  },
  {
    id: '6',
    name: 'Convertible Car Seat',
    category: 'Baby Equipment',
    price: 40,
    image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a',
    description: 'Safety-certified car seat for infants and toddlers',
    availability: 'limited',
    features: ['Safety Certified', 'Convertible', 'Easy Installation', 'Machine Washable']
  },
  {
    id: '7',
    name: 'Portable Baby Crib',
    category: 'Baby Equipment',
    price: 30,
    image: 'https://images.unsplash.com/photo-1631914197223-b0ad8c0ec2a0',
    description: 'Lightweight portable crib for safe baby sleep',
    availability: 'available',
    features: ['Lightweight', 'Quick Setup', 'Breathable Mesh', 'Travel Bag Included']
  },
  {
    id: '8',
    name: 'High Chair',
    category: 'Baby Equipment',
    price: 22,
    image: 'https://images.unsplash.com/photo-1598736742398-e3c2c6b9d95e',
    description: 'Adjustable high chair for mealtime comfort',
    availability: 'unavailable',
    features: ['Height Adjustable', 'Safety Harness', 'Easy Clean', 'Foldable']
  },

];

export const getAvailableCategories = (): string[] => {
  return [...new Set(mockEquipment.map(item => item.category))];
};

export const getAvailabilityOptions = (): string[] => {
  return ['available', 'limited', 'unavailable'];
};

export const getPriceRange = (): [number, number] => {
  const prices = mockEquipment.map(item => item.price);
  return [Math.min(...prices), Math.max(...prices)];
};
