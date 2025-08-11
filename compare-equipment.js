const currentEquipment = require('./beach-equipment-current.json');
const pdfContent = require('./beach-equipment-pdf-content.json');

// Flatten PDF content into a searchable array
const pdfEquipment = [];
Object.keys(pdfContent).forEach(category => {
  pdfContent[category].forEach(item => {
    pdfEquipment.push({
      name: item.name,
      category: category,
      description: item.description,
      usage_info: item.usage_info || []
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
      'tommy bahama high boys': 'tommy bahama hi boy beach chairs',
      'ostrich lounge chairs': 'ostrich 3n1 lounge chairs',
      'ammsun umbrella': 'the ammsun umbrella',
      'stearns puddle jumper': 'puddle jumper'
    };
    
    const mappedName = nameMappings[normalizedName];
    if (mappedName) {
      pdfMatch = pdfEquipmentMap[mappedName];
    }
  }
  
  if (pdfMatch) {
    // Check if description needs updating
    const currentDesc = item.description.toLowerCase().replace(/\s+/g, ' ').trim();
    const pdfDesc = pdfMatch.description.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Simple comparison - in reality, you'd want more sophisticated diff checking
    if (currentDesc !== pdfDesc) {
      equipmentToUpdate.push({
        id: item.id,
        name: item.name,
        currentDescription: item.description,
        pdfDescription: pdfMatch.description,
        usageInfo: pdfMatch.usage_info
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

console.log('=== EQUIPMENT THAT NEEDS TO BE UPDATED ===');
console.log(JSON.stringify(equipmentToUpdate, null, 2));

console.log('\n=== EQUIPMENT IN DATABASE BUT NOT IN PDF ===');
console.log(JSON.stringify(equipmentNotInPdf, null, 2));

// Also check for equipment in PDF but not in database
const equipmentNotInDatabase = [];
pdfEquipment.forEach(pdfItem => {
  const normalizedName = normalizeName(pdfItem.name);
  const dbMatch = currentEquipment.find(dbItem => 
    normalizeName(dbItem.name) === normalizedName ||
    normalizeName(dbItem.name) === normalizedName.replace('the ', '') ||
    normalizeName(dbItem.name).includes(normalizedName.split(' ')[0])
  );
  
  if (!dbMatch) {
    equipmentNotInDatabase.push(pdfItem);
  }
});

console.log('\n=== EQUIPMENT IN PDF BUT NOT IN DATABASE ===');
console.log(JSON.stringify(equipmentNotInDatabase, null, 2));
