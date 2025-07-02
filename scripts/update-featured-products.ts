import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Featured products with their desired sort order
const featuredProductsConfig = [
  { name: 'Ostrich Lounge Chairs', sort_order: 1 },
  { name: 'Tommy Bahama Beach Chair', sort_order: 2 },
  { name: 'Shibumi Quiet Canopy', sort_order: 3 },
  { name: 'Dream On Me Full Size foldable crib', sort_order: 4 },
  { name: 'Jeep Jogger Stroller | Single', sort_order: 5 },
  { name: 'Summer Portable Play Yard with Canopy', sort_order: 6 }
];

async function updateFeaturedProducts() {
  console.log('Starting featured products update...');

  try {
    // First, reset all products to not featured
    const { error: resetError } = await supabaseAdmin
      .from('equipment')
      .update({ featured: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (resetError) {
      console.error('Error resetting featured status:', resetError.message);
      return;
    }

    console.log('Reset all products to not featured');

    // Update each featured product
    for (const product of featuredProductsConfig) {
      const { error: updateError } = await supabaseAdmin
        .from('equipment')
        .update({ 
          featured: true, 
          sort_order: product.sort_order 
        })
        .eq('name', product.name);

      if (updateError) {
        console.error(`Error updating ${product.name}:`, updateError.message);
      } else {
        console.log(`Updated ${product.name} as featured with sort_order ${product.sort_order}`);
      }
    }

    console.log('Featured products update completed successfully.');
  } catch (error) {
    console.error('Update failed:', error);
  }
}

async function main() {
  try {
    await updateFeaturedProducts();
    console.log('Update completed successfully.');
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    process.exit(0);
  }
}

main();
