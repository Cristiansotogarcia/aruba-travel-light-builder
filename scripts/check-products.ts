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

async function checkProducts() {
  console.log('Checking all products in database...');

  try {
    // Get all products
    const { data: allProducts, error: allError } = await supabaseAdmin
      .from('equipment')
      .select('id, name, featured, sort_order')
      .order('name');

    if (allError) {
      console.error('Error fetching all products:', allError.message);
      return;
    }

    console.log('\n=== ALL PRODUCTS ===');
    allProducts?.forEach(product => {
      console.log(`- ${product.name} (featured: ${product.featured}, sort_order: ${product.sort_order})`);
    });

    // Get featured products
    const { data: featuredProducts, error: featuredError } = await supabaseAdmin
      .from('equipment')
      .select('id, name, featured, sort_order')
      .eq('featured', true)
      .order('sort_order');

    if (featuredError) {
      console.error('Error fetching featured products:', featuredError.message);
      return;
    }

    console.log('\n=== FEATURED PRODUCTS ===');
    featuredProducts?.forEach(product => {
      console.log(`${product.sort_order}. ${product.name}`);
    });

  } catch (error) {
    console.error('Check failed:', error);
  }
}

async function main() {
  try {
    await checkProducts();
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    process.exit(0);
  }
}

main();
