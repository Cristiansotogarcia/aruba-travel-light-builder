export const mockEquipment = [
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
    // Beach Equipment (Water Sports)
    {
        id: '9',
        name: 'Single Kayak',
        category: 'Beach Equipment',
        price: 45,
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
        description: 'Stable single-person kayak perfect for exploring',
        availability: 'available',
        features: ['Stable Design', 'Paddle Included', 'Storage Compartment', 'Lightweight']
    },
    {
        id: '10',
        name: 'Stand-up Paddleboard',
        category: 'Beach Equipment',
        price: 40,
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5',
        description: 'Inflatable SUP board with pump and paddle',
        availability: 'available',
        features: ['Inflatable', 'Pump Included', 'Paddle Included', 'Repair Kit']
    },
    {
        id: '11',
        name: 'Life Jacket Set (4)',
        category: 'Beach Equipment',
        price: 15,
        image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635',
        description: 'Coast Guard approved life jackets in various sizes',
        availability: 'available',
        features: ['Coast Guard Approved', 'Multiple Sizes', 'Comfortable Fit', 'Bright Colors']
    },
    {
        id: '12',
        name: 'Water Toys Bundle',
        category: 'Beach Equipment',
        price: 28,
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
        description: 'Fun water toys including floats and games',
        availability: 'limited',
        features: ['Multiple Toys', 'Safe Materials', 'Easy Storage', 'Family Fun']
    }
];
export const getAvailableCategories = () => {
    return [...new Set(mockEquipment.map(item => item.category))];
};
export const getAvailabilityOptions = () => {
    return ['available', 'limited', 'unavailable'];
};
export const getPriceRange = () => {
    const prices = mockEquipment.map(item => item.price);
    return [Math.min(...prices), Math.max(...prices)];
};
