const fs = require('fs');

// Read the original query script output
const data = fs.readFileSync('current-equipment-data.json', 'utf8');

// Extract baby equipment items manually
const lines = data.split('\n');
const babyEquipment = [];
let currentItem = null;
let inBabyEquipment = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.includes('"category": "Baby Equipment"')) {
    // Find the opening brace of this item
    let j = i;
    while (j >= 0 && !lines[j].trim().startsWith('{')) {
      j--;
    }
    
    // Find the closing brace of this item
    let braceCount = 0;
    let startLine = j;
    let endLine = j;
    
    for (let k = j; k < lines.length; k++) {
      const currentLine = lines[k];
      if (currentLine.includes('{')) {
        braceCount++;
      }
      if (currentLine.includes('}')) {
        braceCount--;
        if (braceCount === 0) {
          endLine = k;
          break;
        }
      }
    }
    
    // Extract the complete item
    const itemLines = lines.slice(startLine, endLine + 1);
    const itemText = itemLines.join('\n');
    
    try {
      // Try to parse this as JSON
      const item = JSON.parse(itemText.replace(/,$/, '')); // Remove trailing comma
      babyEquipment.push(item);
    } catch (e) {
      console.log('Could not parse item: ' + e.message);
    }
  }
}

console.log('Extracted ' + babyEquipment.length + ' baby equipment items');
fs.writeFileSync('baby-equipment-current.json', JSON.stringify(babyEquipment, null, 2));
console.log('Baby equipment file created successfully');
