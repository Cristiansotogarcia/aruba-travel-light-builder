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

async function checkFeaturedDetails() {
  console.log('Checking featured products details...');

  try {
    // Get featured products with all details
    const { data: featuredProducts, error } = await supabaseAdmin
      .from('equipment')
      .select('*')
      .eq('featured', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching featured products:', error.message);
      return;
    }

    console.log('\n=== FEATURED PRODUCTS DETAILS ===');
    featuredProducts?.forEach(product => {
      console.log(`\n${product.sort_order}. ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Featured: ${product.featured}`);
      console.log(`   Sort Order: ${product.sort_order}`);
      console.log(`   Price: $${product.price_per_day}/day`);
      console.log(`   Image URL: ${product.image_url || 'NO IMAGE'}`);
      console.log(`   Description: ${product.description ? product.description.substring(0, 100) + '...' : 'NO DESCRIPTION'}`);
      console.log(`   Created: ${product.created_at}`);
    });

    console.log(`\nTotal featured products: ${featuredProducts?.length || 0}`);

  } catch (error) {
    console.error('Check failed:', error);
  }
}

async function main() {
  try {
    await checkFeaturedDetails();
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    process.exit(0);
  }
}

main();
