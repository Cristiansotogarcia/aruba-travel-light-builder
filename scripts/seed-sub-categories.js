import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or service key is not defined in the environment variables.');
}
const supabase = createClient(supabaseUrl, supabaseKey);
const beachEquipmentMapping = {
    'Beach Chairs': [
        'Tommy Bahama Beach Chair',
        'Tommy Bahama Hi Boy',
        'Tommy Bahama Kids Beach Chair',
        'Ostrich Beach Chairs',
    ],
    'Shades/Umbrellas': [
        'Ammsun 8Ft Umbrella',
        'Beach Bub USA Umbrella',
        'Cool Cabana 64ft',
        'Ammsun Cabana',
        'Shibumi Quiet Canopy',
    ],
    'Coolers': [
        '12qt Cooler',
        '16qt Wheeled Cooler',
        '28/30qt Wheeled Cooler',
        '28/30 Regular Cooler',
        '60qt Wheeled Cooler',
    ],
    'Snorkel Gear': [
        'Snorkel Mask & Tube',
        'Snorkel Vest',
    ],
    'Water Safety Gear': [
        'Infant Life Jacket',
        'Kids Life Jacket',
        'Youth Life Jacket',
        'Adult Life Jacket',
        'Adult Plus Size Life Jacket',
        'Puddle Jumpers',
    ],
    'Others': [
        'Beach Wagon',
        'Sand Toys',
        'Shareable Sand Toys',
        'Corn Hole Game',
        'Paddle Ball',
        'Sand Bag Anchor',
        'Beach Dolly (Big Wheels)',
    ],
};
const babyEquipmentMapping = {
    'Sleep Essentials': [
        'Dream-On-Me Full Size Foldable Crib',
        'Dream-On-Me Foldable Mini Crib',
        'Portable Bassinet',
        'Slumbertod inflatable bed',
        'Pack and Play',
        'Slumberpod (blackout tent)',
        'Hiccapop Portable Pack and Play Mattress',
        'Bed Rails 2 Sided',
        'Bed Rails 1 Sided',
    ],
    'Other Sleep Essentials': [
        'Hatch Rest 2nd Gen Sound Machine',
        'Hello Baby Video Baby Monitor',
        'Yoga Sleep Sound Machine',
    ],
    'High Chairs & Baby Chairs': [
        'Antilop Baby High Chair by Ikea',
        'Bumbo Seat',
        'Bumbo Playtop Safari Suction Tray',
        'Summer Pop N Dine Portable High Chair',
        'ComfyBumpy Ergonomic Baby Bouncer Seat',
        'Inglesina Fast Table Chair - Portable High Chair',
    ],
    'Strollers': [
        'Summer Infant, 3D Mini Convenience Stroller',
        'Graco Ready2Jet Compact Stroller',
        'Baby Trend Jogger Stroller',
        'Baby Trend Ride on Stroller Board',
        'Jeep Jogger Stroller',
        'Jeep Double Stroller',
        'Jeep All Terrain Stroller Wagon',
        'Travel System Stroller by evenflo',
        'Evenflo Ride on Stroller Board',
    ],
    'Car Seats': [
        'Graco Snugnride 35 Lite LX Infant Car Seat',
        'Safety 1st Grow and Go all in One Car Seat',
        'Graco Backless Booster Car Seat',
        'Baby Car Safety Mirror',
    ],
    'Baby mobility and activity equipment': [
        'Baby Walker',
        'Evenflo Baby Activity Center',
        'Baby Einstein Activity Table',
        'Baby Einstein Activity Jumper',
        'Fisher Price Ride on Toy',
        'Little Tikes Slide',
        'Little Tikes Rocking Horse',
        'Foldable Play Mat (toddleroo by northstate)',
    ],
    'Toys': [
        'Fisher Price Baby Toys Package',
        'Mega Bloks 80pc',
        'Mega Bloks Table',
        'Fisher Price Cash Register',
        'Vtech Turn & Learn Driver',
        'Fisher Price Giant Rack-A-Stack',
        'Little Tikes Tap-A-Tune Drum',
        '6 Pack Colorful Toddler Toy Trucks',
        'Mega Bloks Spinning Wagon',
        'Little People Adventures Airport Playset',
        'Little People Construction Site Playset',
        'Little People Friends Together Play House Set',
        'Toddler Toy Bin (12 toys)',
        'Toddler Sports Bin',
    ],
    'Beach/Outdoor': [
        'Summer Portable Play Yard with Canopy',
        'Play yard mat',
        'Sand Toys',
        'Shareable Sand Toys',
    ],
    'Swim Floatation and Safety Gear': [
        'Mambo Baby Float',
        'Swimways Baby Float',
        'Laycol Baby Float with Canopy',
        'Infant Life Jacket',
        'Kids Life Jacket',
        'Puddle Jumpers',
    ],
    'Bath Time': [
        'Summer Infant Splish N Splash Baby Bath Tub',
        'Angelcare Baby Bath Support',
        'Boon Soak 3 Stage Baby Bathtub',
    ],
    'Miscellaneous': [
        'Boppy Nursing Pillow',
        'Baby Gate',
        'Portable Changing Table',
        'Baby Brezza Bottle Warmer',
        'Dr Browns Bottle Sterilizer',
    ],
};
const seedSubCategories = async () => {
    console.log('Fetching equipment...');
    const { data: equipment, error } = await supabase.from('equipment').select('id, name, category');
    if (error) {
        console.error('Error fetching equipment:', error);
        return;
    }
    if (!equipment) {
        console.log('No equipment found.');
        return;
    }
    console.log(`Found ${equipment.length} equipment items.`);
    for (const item of equipment) {
        let subCategory = null;
        const mapping = item.category === 'Beach Equipment' ? beachEquipmentMapping : babyEquipmentMapping;
        for (const [sub, products] of Object.entries(mapping)) {
            for (const productName of products) {
                if (item.name.toLowerCase().includes(productName.toLowerCase())) {
                    subCategory = sub;
                    break;
                }
            }
            if (subCategory) {
                break;
            }
        }
        if (subCategory) {
            console.log(`Updating "${item.name}" with sub-category "${subCategory}"`);
            const { error: updateError } = await supabase
                .from('equipment')
                .update({ sub_category: subCategory })
                .eq('id', item.id);
            if (updateError) {
                console.error(`Failed to update "${item.name}":`, updateError);
            }
        }
        else {
            console.log(`No sub-category found for "${item.name}"`);
        }
    }
    console.log('Sub-category seeding complete.');
};
seedSubCategories();
