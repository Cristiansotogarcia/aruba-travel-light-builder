const currentEquipment = require('./baby-equipment-current.json');
const pdfContent = require('./baby-equipment-pdf-content.json');

// Flatten PDF content into a searchable array
const pdfEquipment = [];
Object.keys(pdfContent).forEach(category => {
  pdfContent[category].forEach(item => {
    pdfEquipment.push({
      name: item.name,
      category: category,
      description: item.description
    });
  });
});

// Function to normalize product names for comparison
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Create a map of normalized PDF equipment names to their data
const pdfEquipmentMap = {};
pdfEquipment.forEach(item => {
  const normalizedName = normalizeName(item.name);
  pdfEquipmentMap[normalizedName] = item;
});

// Compare current equipment with PDF content
const equipmentToUpdate = [];
const equipmentNotInPdf = [];

currentEquipment.forEach(item => {
  const normalizedName = normalizeName(item.name);
  
  // Special handling for some name variations
  let pdfMatch = pdfEquipmentMap[normalizedName];
  
  // Handle specific name mappings
  if (!pdfMatch) {
    const nameMappings = {
      'dream on me full size foldable crib': 'dream-on-me full size foldable crib',
      'dream on me mini crib': 'dream-on-me mini foldable crib',
      'hiccapop portable pack and play mattress': 'hiccapop pack and play mattress',
      'the slumbertot by slumberpod': 'the slumbertot by slumberpod',
      'slumberpod (blackout tent)': 'slumberpod',
      'regalo bed rails - 2 sided rail': 'regalo bed rails',
      'regalo bed rails - 1 sided rail': 'regalo bed rails',
      'summer pop n dine portable high chair': 'summer pop n dine portable high chair',
      'bumbo playtop safari suction tray': 'bumbo playtop safary suction tray',
      'comfybumpy ergonomic baby bouncer seat': 'comfybumpy ergonomic baby bouncer seat',
      'summer infant 3d mini convenience stroller': 'summer infant 3d mini convenience stroller',
      'baby trend jogger stroller': 'baby trend expedition jogger stroller',
      'jeep jogger stroller': 'baby trend expedition jogger stroller',
      'jeep double stroller': 'jeep double stroller',
      'jeep all terrain stroller wagon': 'jeep all terrain stroller wagon',
      'travel system stroller by evenflo': 'travel system stroller by evenflo',
      'graco snugnride 35 lite lx infant car seat': 'evenflo infant car seat',
      'graco backless booster car seat': 'evenflo backless booster car seat',
      'safety 1st grow and go all in one car seat': 'safety 1st grow and go all in one car seat',
      'baby car safety mirror': 'baby car safety mirror',
      'baby einstein activity jumper': 'baby einstein ocean explorers curiosity cove 2-in-1 educational activityjumper and floor toy',
      'fisher price baby toys package': 'fisher price baby toys package',
      'mega bloks 80pc': 'mega bloks 80pc',
      'mega bloks table': 'mega bloks table',
      'fisher price cash register': 'fisher price cash register',
      'vtech turn & learn driver': 'vtech turn & learn driver',
      'fisher price giant rack-a-stack': 'fisher price giant rack-a-stack',
      'little tikes tap a tune drum': 'little tikes tap-a-tune drum',
      'angelcare baby bath support': 'angelcare baby bath support',
      'boon soak 3 stage baby bathtub': 'boon soak 3 stage baby bathtub',
      'hello baby video baby monitor': 'hello baby video monitor',
      'hatch rest 2nd gen sound machine': 'sound machine',
      'boppy nursing pillow': 'boppy nursing pillow',
      'baby gate': 'baby gate',
      'baby brezza bottle warmer': 'baby brezza bottle warmer',
      'dr browns bottle sterilizer': 'dr browns bottle sterilizer',
      'slumbertod inflatable bed': 'the slumbertot by slumberpod',
      'portable bassinet': 'munchkin brica portable bassinet',
      'pack and play': 'pack and play',
      'hiccapop portable pack and play mattress': 'hiccapop pack and play mattress',
      'bed rails 2 sided': 'regalo bed rails',
      'bed rails 1 sided': 'regalo bed rails',
      'yoga sleep sound machine': 'sound machine',
      'inglesina fast table chair - portable high chair': 'summer pop n dine portable high chair',
      'evenflo ride on stroller board': 'evenflo ride on stroller board',
      '6 pack colorful toddler toy trucks': 'fisher price baby toys package',
      'mega bloks spinning wagon': 'mega bloks table'
    };
    
    const mappedName = nameMappings[normalizedName];
    if (mappedName) {
      pdfMatch = pdfEquipmentMap[mappedName];
    }
  }
  
  if (pdfMatch) {
    // Check if description needs updating
    const currentDesc = item.description.toLowerCase().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const pdfDesc = pdfMatch.description.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Simple comparison - in reality, you'd want more sophisticated diff checking
    if (currentDesc !== pdfDesc) {
      equipmentToUpdate.push({
        id: item.id,
        name: item.name,
        currentDescription: item.description,
        pdfDescription: pdfMatch.description,
        category: item.category,
        sub_category: item.sub_category
      });
    }
  } else {
    equipmentNotInPdf.push({
      id: item.id,
      name: item.name,
      category: item.category,
      sub_category: item.sub_category,
      description: item.description
    });
  }
});

console.log('=== BABY EQUIPMENT THAT NEEDS TO BE UPDATED ===');
console.log(JSON.stringify(equipmentToUpdate, null, 2));

console.log('\n=== BABY EQUIPMENT IN DATABASE BUT NOT IN PDF ===');
console.log(JSON.stringify(equipmentNotInPdf, null, 2));

// Also check for equipment in PDF but not in database
const equipmentNotInDatabase = [];
pdfEquipment.forEach(pdfItem => {
  const normalizedName = normalizeName(pdfItem.name);
  const dbMatch = currentEquipment.find(dbItem => {
    const dbName = normalizeName(dbItem.name);
    return dbName === normalizedName ||
           dbName === normalizedName.replace('the ', '') ||
           dbName.includes(normalizedName.split(' ')[0]) ||
           (normalizedName === 'dream-on-me full size foldable crib' && dbName.includes('dream on me full size')) ||
           (normalizedName === 'dream-on-me mini foldable crib' && dbName.includes('dream on me mini crib')) ||
           (normalizedName === 'evenflo infant car seat' && dbName.includes('graco snugnride')) ||
           (normalizedName === 'baby trend expedition jogger stroller' && dbName.includes('baby trend jogger')) ||
           (normalizedName === 'jeep all terrain stroller wagon' && dbName.includes('jeep all terrain')) ||
           (normalizedName === 'bumbo playtop safary suction tray' && dbName.includes('bumbo playtop')) ||
           (normalizedName === 'baby einstein ocean explorers curiosity cove 2-in-1 educational activityjumper and floor toy' && dbName.includes('baby einstein activity jumper')) ||
           (normalizedName === 'fisher price giant rack-a-stack' && dbName.includes('fisher price giant rack')) ||
           (normalizedName === 'little tikes tap-a-tune drum' && dbName.includes('little tikes tap')) ||
           (normalizedName === 'boon soak 3 stage baby bathtub' && dbName.includes('boon soak 3 stage')) ||
           (normalizedName === 'hatch rest 2nd gen sound machine' && dbName.includes('hatch rest')) ||
           (normalizedName === 'dr browns bottle sterilizer' && dbName.includes('dr browns')) ||
           (normalizedName === 'the slumbertot by slumberpod' && dbName.includes('slumbertot')) ||
           (normalizedName === 'munchkin brica portable bassinet' && dbName.includes('portable bassinet')) ||
           (normalizedName === 'hiccapop pack and play mattress' && dbName.includes('hiccapop')) ||
           (normalizedName === 'regalo bed rails' && dbName.includes('bed rails')) ||
           (normalizedName === 'sound machine' && (dbName.includes('hatch rest') || dbName.includes('yoga sleep'))) ||
           (normalizedName === 'summer pop n dine portable high chair' && dbName.includes('summer pop n dine')) ||
           (normalizedName === 'evenflo ride on stroller board' && dbName.includes('ride on')) ||
           (normalizedName === 'fisher price baby toys package' && dbName.includes('fisher price')) ||
           (normalizedName === 'mega bloks table' && dbName.includes('mega bloks'));
  });
  
  if (!dbMatch) {
    equipmentNotInDatabase.push(pdfItem);
  }
});

console.log('\n=== BABY EQUIPMENT IN PDF BUT NOT IN DATABASE ===');
console.log(JSON.stringify(equipmentNotInDatabase, null, 2));
