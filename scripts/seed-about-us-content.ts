import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function seedAboutUsContent() {
  try {
    console.log('Starting About Us content seeding...');

    // Seed homepage about us content
    const { error: homepageError } = await supabase
      .from('content_blocks')
      .upsert({
        block_key: 'about_us_short',
        page_slug: 'homepage',
        title: 'About Us',
        content: 'Learn more about our company and what we do. We provide excellent service and quality products to our customers.',
        block_type: 'text',
        is_active: true
      }, {
        onConflict: 'block_key,page_slug'
      });

    if (homepageError) {
      console.error('Error seeding homepage content:', homepageError);
    } else {
      console.log('✅ Homepage about us content seeded successfully');
    }

    // Seed about page content
    const { error: aboutPageError } = await supabase
      .from('content_blocks')
      .upsert({
        block_key: 'about_us_full',
        page_slug: 'about-us',
        title: 'About Us',
        content: 'Welcome to our company. We are dedicated to providing excellent service and quality products to our customers. Our mission is to deliver outstanding value and ensure customer satisfaction through our comprehensive range of services.',
        block_type: 'text',
        is_active: true
      }, {
        onConflict: 'block_key,page_slug'
      });

    if (aboutPageError) {
      console.error('Error seeding about page content:', aboutPageError);
    } else {
      console.log('✅ About page content seeded successfully');
    }

    console.log('🎉 About Us content seeding completed successfully');
  } catch (error) {
    console.error('❌ Error seeding content:', error);
  }
}

seedAboutUsContent();
