import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface Equipment {
  name: string;
  category: string;
  price_per_day: number;
  description: string;
  images: string[];
  image_url: string;
  availability: boolean;
  availability_status: 'Available' | 'Low Stock' | 'Out of Stock';
  featured?: boolean;
  sort_order?: number;
}

const equipmentData: Equipment[] = [
  // Featured Products for Popular Equipment Section
  {
    name: 'Ostrich Loung Chairs',
    category: 'Beach Equipment',
    price_per_day: 25,
    description: 'Premium comfortable lounge chairs perfect for beach relaxation',
    images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19'],
    image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
    availability: true,
    availability_status: 'Available',
    featured: true,
    sort_order: 1
  },
  {
    name: 'Tommy Bahama Beach Chair',
    category: 'Beach Equipment',
    price_per_day: 20,
    description: 'Stylish and comfortable Tommy Bahama beach chair',
    images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19'],
    image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
    availability: true,
    availability_status: 'Available',
    featured: true,
    sort_order: 2
  },
  {
    name: 'Shibumi Quiet Canopy',
    category: 'Beach Equipment',
    price_per_day: 30,
    description: 'Innovative wind-powered beach canopy for natural shade',
    images: ['https://images.unsplash.com/photo-1500375592092-40eb2168fd21'],
    image_url: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21',
    availability: true,
    availability_status: 'Available',
    featured: true,
    sort_order: 3
  },
  {
    name: 'Dream On Me Full Size Foldable Crib',
    category: 'Baby Equipment',
    price_per_day: 35,
    description: 'Full-size foldable crib for safe and comfortable baby sleep',
    images: ['https://images.unsplash.com/photo-1631914197223-b0ad8c0ec2a0'],
    image_url: 'https://images.unsplash.com/photo-1631914197223-b0ad8c0ec2a0',
    availability: true,
    availability_status: 'Available',
    featured: true,
    sort_order: 4
  },
  {
    name: 'Jeep Jogger Stroller | Single',
    category: 'Baby Equipment',
    price_per_day: 40,
    description: 'All-terrain Jeep jogger stroller perfect for active families',
    images: ['https://images.unsplash.com/photo-1721322800607-8c38375eef04'],
    image_url: 'https://images.unsplash.com/photo-1721322800607-8c38375eef04',
    availability: true,
    availability_status: 'Available',
    featured: true,
    sort_order: 5
  },
  {
    name: 'Summer Portable Play Yard with Canopy',
    category: 'Baby Equipment',
    price_per_day: 32,
    description: 'Portable play yard with UV protection canopy for outdoor fun',
    images: ['https://images.unsplash.com/photo-1598736742398-e3c2c6b9d95e'],
    image_url: 'https://images.unsplash.com/photo-1598736742398-e3c2c6b9d95e',
    availability: true,
    availability_status: 'Available',
    featured: true,
    sort_order: 6
  },

  // Other Beach Equipment
  {
    name: 'Premium Beach Umbrella',
    category: 'Beach Equipment',
    price_per_day: 15,
    description: 'Large UV-protection umbrella perfect for family beach days',
    images: ['https://images.unsplash.com/photo-1500375592092-40eb2168fd21'],
    image_url: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21',
    availability: true,
    availability_status: 'Available',
    featured: false,
    sort_order: 10
  },
  {
    name: 'Beach Chair Set (2)',
    category: 'Beach Equipment',
    price_per_day: 20,
    description: 'Comfortable reclining beach chairs for two people',
    images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19'],
    image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
    availability: true,
    availability_status: 'Available',
    featured: false,
    sort_order: 11
  },
  {
    name: 'Premium Cooler (48qt)',
    category: 'Beach Equipment',
    price_per_day: 25,
    description: 'Large insulated cooler keeps drinks cold all day',
    images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96'],
    image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96',
    availability: true,
    availability_status: 'Available',
    featured: false,
    sort_order: 12
  },
  {
    name: 'Snorkel Gear Set',
    category: 'Beach Equipment',
    price_per_day: 18,
    description: 'Complete snorkeling set with mask, snorkel, and fins',
    images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19'],
    image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
    availability: true,
    availability_status: 'Available',
    featured: false,
    sort_order: 13
  },

  // Baby Equipment
  {
    name: 'All-Terrain Stroller',
    category: 'Baby Equipment',
    price_per_day: 35,
    description: 'Rugged stroller perfect for beach and city exploring',
    images: ['https://images.unsplash.com/photo-1721322800607-8c38375eef04'],
    image_url: 'https://images.unsplash.com/photo-1721322800607-8c38375eef04',
    availability: true,
    availability_status: 'Available',
    featured: false,
    sort_order: 20
  },
  {
    name: 'Convertible Car Seat',
    category: 'Baby Equipment',
    price_per_day: 40,
    description: 'Safety-certified car seat for infants and toddlers',
    images: ['https://images.unsplash.com/photo-1586015555751-63bb77f4322a'],
    image_url: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a',
    availability: true,
    availability_status: 'Available',
    featured: false,
    sort_order: 21
  },
  {
    name: 'Portable Baby Crib',
    category: 'Baby Equipment',
    price_per_day: 30,
    description: 'Lightweight portable crib for safe baby sleep',
    images: ['https://images.unsplash.com/photo-1631914197223-b0ad8c0ec2a0'],
    image_url: 'https://images.unsplash.com/photo-1631914197223-b0ad8c0ec2a0',
    availability: true,
    availability_status: 'Available',
    featured: false,
    sort_order: 22
  },
  {
    name: 'High Chair',
    category: 'Baby Equipment',
    price_per_day: 22,
    description: 'Adjustable high chair for mealtime comfort',
    images: ['https://images.unsplash.com/photo-1598736742398-e3c2c6b9d95e'],
    image_url: 'https://images.unsplash.com/photo-1598736742398-e3c2c6b9d95e',
    availability: false,
    availability_status: 'Out of Stock',
    featured: false,
    sort_order: 23
  },

];

async function seedEquipment() {
  console.log('Starting equipment seeding process...');

  // Check if equipment already exists
  const { data: existingEquipment, error: checkError } = await supabaseAdmin
    .from('equipment')
    .select('name')
    .limit(1);

  if (checkError) {
    console.error('Error checking existing equipment:', checkError.message);
    return;
  }

  if (existingEquipment && existingEquipment.length > 0) {
    console.log('Equipment data already exists, skipping seeding...');
    return;
  }

  // Insert equipment data
  const { error: insertError } = await supabaseAdmin
    .from('equipment')
    .insert(equipmentData);

  if (insertError) {
    console.error('Error inserting equipment data:', insertError.message);
    return;
  }

  console.log('Equipment seeding completed successfully.');
}

async function main() {
  try {
    await seedEquipment();
    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

main();
