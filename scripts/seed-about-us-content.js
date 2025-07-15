const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedAboutUsContent() {
  try {
    console.log('Seeding about us content...');

    // Insert homepage about us content
    const { error: homepageError } = await supabase
      .from('content_blocks')
      .upsert({
        block_key: 'about_us_short',
        page_slug: 'homepage',
        title: 'About Us',
        content: 'We are Aruba Travel Light, your trusted partner for baby equipment rental in Aruba. We provide high-quality, safe, and clean baby equipment to make your family vacation stress-free and enjoyable.',
        block_type: 'text',
        is_active: true,
        sort_order: 1
      }, {
        onConflict: 'block_key,page_slug'
      });

    if (homepageError) throw homepageError;

    // Insert about us page content
    const { error: aboutError } = await supabase
      .from('content_blocks')
      .upsert({
        block_key: 'about_us_full',
        page_slug: 'about-us',
        title: 'About Aruba Travel Light',
        content: `Welcome to Aruba Travel Light, your premier destination for baby equipment rental services in beautiful Aruba!

At Aruba Travel Light, we understand that traveling with young children can be challenging. That's why we've made it our mission to provide families with a hassle-free vacation experience by offering top-quality baby equipment rentals.

Our Story
Founded by parents who experienced the struggles of traveling with baby gear firsthand, we set out to create a service that would allow families to travel light while ensuring their little ones have everything they need for a comfortable and safe stay.

What We Offer
We provide a comprehensive range of baby equipment including:
- Strollers and car seats
- Cribs and high chairs
- Baby monitors and safety gates
- Toys and entertainment items
- Feeding accessories and more

Quality & Safety
All our equipment is:
- Thoroughly cleaned and sanitized after each use
- Regularly inspected for safety
- From trusted, high-quality brands
- Age-appropriate and in excellent condition

Our Commitment
We are committed to making your family vacation as smooth and enjoyable as possible. Our team is available to answer any questions and provide recommendations based on your specific needs.

Contact us today to learn how we can help make your Aruba vacation unforgettable!`,
        block_type: 'text',
        is_active: true,
        sort_order: 1
      }, {
        onConflict: 'block_key,page_slug'
      });

    if (aboutError) throw aboutError;

    console.log('About us content seeded successfully!');
  } catch (error) {
    console.error('Error seeding about us content:', error);
    process.exit(1);
  }
}

seedAboutUsContent();
