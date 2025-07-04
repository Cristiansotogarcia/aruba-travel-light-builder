const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, 'src');
const duplicates = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      const baseName = entry.name.replace(/\.js$/, '');
      const tsxFile = path.join(dir, baseName + '.tsx');

      if (fs.existsSync(tsxFile)) {
        const jsContent = fs.readFileSync(fullPath, 'utf-8').trim();
        const tsxContent = fs.readFileSync(tsxFile, 'utf-8').trim();
        const identical = jsContent === tsxContent;

        duplicates.push({
          js: fullPath,
          tsx: tsxFile,
          identical,
        });
      }
    }
  }
}

walk(rootDir);

// Output
console.log('\n🔍 Duplicate .js/.tsx files found:\n');

if (duplicates.length === 0) {
  console.log('✅ No duplicates found.\n');
} else {
  duplicates.forEach((entry, index) => {
    console.log(`#${index + 1}`);
    console.log(`  JS File:  ${entry.js}`);
    console.log(`  TSX File: ${entry.tsx}`);
    console.log(`  🔁 Identical: ${entry.identical ? '✅ Yes' : '❌ No'}\n`);
  });

  console.log(`💡 Total duplicates found: ${duplicates.length}\n`);
}
