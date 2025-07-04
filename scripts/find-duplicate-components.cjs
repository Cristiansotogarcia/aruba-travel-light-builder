const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../src');
const filesByBasename = new Map();

const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx'];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      walk(fullPath);
      continue;
    }

    const extension = path.extname(entry.name);
    if (allowedExtensions.includes(extension)) {
      const basename = path.basename(entry.name, extension);
      const key = path.join(dir, basename);
      if (!filesByBasename.has(key)) {
        filesByBasename.set(key, new Set());
      }
      filesByBasename.get(key).add(fullPath);
    }
  }
}

walk(rootDir);

const duplicates = [];
for (const fileSet of filesByBasename.values()) {
  if (fileSet.size > 1) {
    duplicates.push(Array.from(fileSet));
  }
}

// Output
console.clear();
let output = '';
if (duplicates.length > 0) {
  output += '\n🔍 Duplicate component files found:\n\n';
  duplicates.forEach((fileGroup, index) => {
    output += `#${index + 1}: ${path.basename(fileGroup[0], path.extname(fileGroup[0]))}\n`;
    fileGroup.forEach(file => {
      output += `  - ${path.relative(path.join(rootDir, '..'), file)}\n`;
    });
    output += '\n';
  });
  output += `💡 Total sets of duplicates found: ${duplicates.length}\n`;
} else {
  output += '✅ No duplicates found.\n';
}
console.log(output);
