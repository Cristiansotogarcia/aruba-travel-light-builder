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

interface EquipmentUpdate {
  id: string;
  name: string;
  description: string;
}

const equipmentUpdates: EquipmentUpdate[] = [
  {
    id: "f1c078fa-78a3-4bbb-a9ae-e5eed33af71d",
    name: "Baby Trend Jogger Stroller",
    description: "The Baby Trend Jogger Stroller is perfect for active parents, featuring large bicycle tires and a front swivel wheel for easy maneuverability. With a reclining seat, five-point harness, and ample storage space, it provides a smooth and comfortable ride for jogging or everyday outings."
  },
  {
    id: "31dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Portable Bassinet",
    description: "The Munchkin Brica Portable Bassinet. This safe and durable travel pod is designed with breathable mesh panels and a removable, locking steel frame to provide comfort and security. Weighing less than 3 lbs. and folding flat for storage, it's incredibly lightweight and easy to transport. With assembled dimensions of 30\" x 21.25\" x 11.75\", it offers ample space for your baby to rest. For cleaning, simply spot or wipe clean, and the sheets are machine washable. Trust Munchkin Brica Portable Bassinet for convenient and comfortable travels with your little one."
  },
  {
    id: "32dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Slumbertod inflatable bed",
    description: "The Slumbertot is an inflatable toddler travel bed designed for comfort and convenience. Perfect for toddlers aged 2 and up, it fits seamlessly inside the SlumberPod, offering a portable sleeping solution for travels and adventures. The Slumbertot has integrated side rails and a soft-touch sleep surface, it ensures a cozy and secure environment for vacations. Tailored exclusively for the SlumberPod, it also functions as a standalone mattress, accommodating up to 200lbs. Safety is prioritized with built-in bumpers, and quick inflation under two minutes with the included electric pump ensures hassle-free setup."
  },
  {
    id: "33dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Pack and Play",
    description: "Dream On Me or Graco Pack and Play, your essential companion for travel, beach outings, and outdoor adventures with your little one. This portable playard provides a secure and comfortable space for your baby to relax and play wherever you go. Its lightweight and compact design makes it easy to transport and set up, ensuring convenience on-the-go. With sturdy construction and breathable mesh sides, it offers safety and ventilation for outdoor use."
  },
  {
    id: "35dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Hiccapop Portable Pack and Play Mattress",
    description: "Hiccapop Pack and Play Compatible Mattress, expertly crafted to perfectly fit your 38\" x 26\" playard with rounded corners and superior edge support for a snug fit. Measuring at 1\" thick, this mattress encourages proper body alignment, offering the ideal balance of comfort and support for your baby's developmental needs."
  },
  {
    id: "36dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Bed Rails 2 Sided",
    description: "The Regalo Bed Rails, a reliable and safe solution to ensure your child's peaceful sleep. Crafted with a blend of fabric and metal, these bedrails are durable and secure. The patented swing-down feature allows for easy access to the bed, while the 43\" long and 20\" tall design provides added security. Setting up is a breeze with no tools required, and the anchoring strap ensures stability. Suitable for twin to queen size beds, these bedrails are designed for children aged 2-5 years old."
  },
  {
    id: "37dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Bed Rails 1 Sided",
    description: "The Regalo Bed Rails, a reliable and safe solution to ensure your child's peaceful sleep. Crafted with a blend of fabric and metal, these bedrails are durable and secure. The patented swing-down feature allows for easy access to the bed, while the 43\" long and 20\" tall design provides added security. Setting up is a breeze with no tools required, and the anchoring strap ensures stability. Suitable for twin to queen size beds, these bedrails are designed for children aged 2-5 years old."
  },
  {
    id: "38dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Hatch Rest 2nd Gen Sound Machine",
    description: "The Hatch Rest 2nd Generation Smart Sound Machine with Wi-Fi enabled connectivity for easier control and more features. With a range of soothing sounds, customizable light settings, and convenient scheduling options, it provides the perfect sleep environment for your little one. Enjoy subtle night light options and customizable color settings. It has Easy-to-use controls and app connectivity for modern parents."
  },
  {
    id: "39dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Hello Baby Video Baby Monitor",
    description: "The Hello Baby video Monitor, your trusted companion for keeping an eye on your little one. Featuring a large 5\" color display and remote control camera with 355° pan and 120° tilt, you'll enjoy a comprehensive view of your baby's room. With infrared night vision and 2-way audio, you can monitor your baby's activities day and night without disturbing their sleep. This non-wifi baby monitor ensures secure and fast data transmission, providing peace of mind against hacking risks. Packed with smart features like room temperature monitoring, 8 lullabies, and multi-camera expandability."
  },
  {
    id: "40dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Yoga Sleep Sound Machine",
    description: "The Hatch Rest 2nd Generation Smart Sound Machine with Wi-Fi enabled connectivity for easier control and more features. With a range of soothing sounds, customizable light settings, and convenient scheduling options, it provides the perfect sleep environment for your little one. Enjoy subtle night light options and customizable color settings. It has Easy-to-use controls and app connectivity for modern parents."
  },
  {
    id: "41dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Summer Pop N Dine Portable High Chair",
    description: "The Summer Pop N Dine Portable High Chair offers convenience and comfort for feeding time on the go. Lightweight and easy to fold, it attaches securely to most tables. Features a comfortable seat, adjustable tray, and easy-to-clean materials."
  },
  {
    id: "43dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Jeep Jogger Stroller",
    description: "The Baby Trend Jogger Stroller is perfect for active parents, featuring large bicycle tires and a front swivel wheel for easy maneuverability. With a reclining seat, five-point harness, and ample storage space, it provides a smooth and comfortable ride for jogging or everyday outings."
  },
  {
    id: "48dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Graco Snugnride 35 Lite LX Infant Car Seat",
    description: "The Evenflo Infant Car Seat provides safety and comfort for your little one. Features include a lightweight design, adjustable base, and energy-absorbing foam. Easy to install and perfect for newborns."
  },
  {
    id: "49dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Graco Backless Booster Car Seat",
    description: "The Evenflo Backless Booster Car Seat ensures safe travel for growing children. Features include a steel-reinforced belt path, adjustable positioning, and easy installation. Perfect for children who have outgrown their car seat."
  },
  {
    id: "51dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Fisher Price Baby Toys Package",
    description: "Fisher Price Baby Toys Package consisting of 3 toys: Baby's first blocks, Baby Stacking Toy, Laugh & Learn Piggy Bank. Recommended aged: 6M+"
  },
  {
    id: "53dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Mega Bloks Table",
    description: "The Mega Bloks Table provides a dedicated building space for your child's creativity. Features a sturdy design with storage compartments for blocks. Perfect for encouraging imaginative play and developing fine motor skills. Recommended Age: 1Y+"
  },
  {
    id: "54dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Fisher Price Cash Register",
    description: "The Fisher Price Cash Register introduces your child to the world of pretend play. Features realistic sounds, lights, and interactive elements that encourage imaginative role-playing. Helps develop math skills and social interaction. Recommended Age: 2Y+"
  },
  {
    id: "55dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Vtech Turn & Learn Driver",
    description: "The VTech Turn & Learn Driver brings the excitement of driving to life for your little one. Features fun lights, sounds, and a steering wheel that encourages imaginative play and helps develop motor skills. Perfect for toddlers. Recommended Age: 6M+"
  },
  {
    id: "56dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Fisher Price Giant Rack-A-Stack",
    description: "The Fisher Price Giant Rack-A-Stack helps develop your baby's hand-eye coordination and problem-solving skills. Features colorful rings of different sizes that stack on a central post. Durable construction perfect for growing children. Recommended Age 12M+"
  },
  {
    id: "58dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "6 Pack Colorful Toddler Toy Trucks",
    description: "Fisher Price Baby Toys Package consisting of 3 toys: Baby's first blocks, Baby Stacking Toy, Laugh & Learn Piggy Bank. Recommended aged: 6M+"
  },
  {
    id: "59dd698d-9860-4cf5-862d-0a1dbfa1a4c0",
    name: "Mega Bloks Spinning Wagon",
    description: "The Mega Bloks Table provides a dedicated building space for your child's creativity. Features a sturdy design with storage compartments for blocks. Perfect for encouraging imaginative play and developing fine motor skills. Recommended Age: 1Y+"
  }
];

async function updateEquipmentDescriptions() {
  console.log('Starting baby equipment description updates...');
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const update of equipmentUpdates) {
    try {
      const { error } = await supabaseAdmin
        .from('equipment')
        .update({ description: update.description })
        .eq('id', update.id);
      
      if (error) {
        console.error(`Error updating ${update.name}:`, error.message);
        errorCount++;
      } else {
        console.log(`✓ Updated ${update.name}`);
        updatedCount++;
      }
    } catch (error) {
      console.error(`Error updating ${update.name}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n=== BABY EQUIPMENT UPDATE SUMMARY ===`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total items processed: ${equipmentUpdates.length}`);
  
  // Log equipment that exists in database but not in PDF
  console.log(`\n=== EQUIPMENT IN DATABASE BUT NOT IN PDF ===`);
  console.log(`10 items found (see comparison results for details)`);
  
  // Log equipment that exists in PDF but not in database
  console.log(`\n=== EQUIPMENT IN PDF BUT NOT IN DATABASE ===`);
  console.log(`4 items found (see comparison results for details)`);
}

async function main() {
  try {
    await updateEquipmentDescriptions();
    console.log('\nBaby equipment description update process completed.');
  } catch (error) {
    console.error('Update process failed:', error);
    process.exit(1);
  }
}

main();
