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
const equipmentData = [
    // Beach Equipment
    {
        name: 'Premium Beach Umbrella',
        category: 'Beach Equipment',
        price_per_day: 15,
        description: 'Large UV-protection umbrella perfect for family beach days',
        images: ['https://images.unsplash.com/photo-1500375592092-40eb2168fd21'],
        availability: true,
        availability_status: 'Available'
    },
    {
        name: 'Beach Chair Set (2)',
        category: 'Beach Equipment',
        price_per_day: 20,
        description: 'Comfortable reclining beach chairs for two people',
        images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19'],
        availability: true,
        availability_status: 'Available'
    },
    {
        name: 'Premium Cooler (48qt)',
        category: 'Beach Equipment',
        price_per_day: 25,
        description: 'Large insulated cooler keeps drinks cold all day',
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96'],
        availability: true,
        availability_status: 'Available'
    },
    {
        name: 'Snorkel Gear Set',
        category: 'Beach Equipment',
        price_per_day: 18,
        description: 'Complete snorkeling set with mask, snorkel, and fins',
        images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19'],
        availability: true,
        availability_status: 'Available'
    },
    // Baby Equipment
    {
        name: 'All-Terrain Stroller',
        category: 'Baby Equipment',
        price_per_day: 35,
        description: 'Rugged stroller perfect for beach and city exploring',
        images: ['https://images.unsplash.com/photo-1721322800607-8c38375eef04'],
        availability: true,
        availability_status: 'Available'
    },
    {
        name: 'Convertible Car Seat',
        category: 'Baby Equipment',
        price_per_day: 40,
        description: 'Safety-certified car seat for infants and toddlers',
        images: ['https://images.unsplash.com/photo-1586015555751-63bb77f4322a'],
        availability: true,
        availability_status: 'Available'
    },
    {
        name: 'Portable Baby Crib',
        category: 'Baby Equipment',
        price_per_day: 30,
        description: 'Lightweight portable crib for safe baby sleep',
        images: ['https://images.unsplash.com/photo-1631914197223-b0ad8c0ec2a0'],
        availability: true,
        availability_status: 'Available'
    },
    {
        name: 'High Chair',
        category: 'Baby Equipment',
        price_per_day: 22,
        description: 'Adjustable high chair for mealtime comfort',
        images: ['https://images.unsplash.com/photo-1598736742398-e3c2c6b9d95e'],
        availability: false,
        availability_status: 'Out of Stock'
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
    }
    catch (error) {
        console.error('Seeding failed:', error);
    }
    finally {
        process.exit(0);
    }
}
main();
