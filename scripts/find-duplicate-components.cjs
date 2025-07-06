const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../src');
const filesByBasename = new Map();
const shouldDelete = process.argv.includes('--delete');

const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx'];

function walk(dir) {
  try {
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
        const key = path.join(path.dirname(fullPath), basename); // Use dirname in key
        if (!filesByBasename.has(key)) {
          filesByBasename.set(key, new Set());
        }
        filesByBasename.get(key).add(fullPath);
      }
    }
  } catch (error) {
    // Ignore errors from reading directories that might not exist
  }
}

walk(rootDir);

const duplicatesToDelete = [];
const duplicatesToReport = [];

for (const [key, fileSet] of filesByBasename.entries()) {
  if (fileSet.size > 1) {
    const files = Array.from(fileSet);
    const tsFile = files.find(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    const jsFile = files.find(f => f.endsWith('.js') || f.endsWith('.jsx'));

    if (tsFile && jsFile) {
      duplicatesToReport.push(files);
      if (shouldDelete) {
        duplicatesToDelete.push(jsFile);
      }
    }
  }
}

// Output
console.clear();
let output = '';

if (shouldDelete) {
  if (duplicatesToDelete.length > 0) {
    output += '🔥 Deleting duplicate .js/.jsx files...\n\n';
    let deleteCount = 0;
    duplicatesToDelete.forEach(file => {
      try {
        fs.unlinkSync(file);
        output += `  - Deleted: ${path.relative(path.join(rootDir, '..'), file)}\n`;
        deleteCount++;
      } catch (err) {
        output += `  - ❗️ Error deleting ${path.relative(path.join(rootDir, '..'), file)}: ${err.message}\n`;
      }
    });
    output += `\n✅ Successfully deleted ${deleteCount} files.\n`;
  } else {
    output += '✅ No duplicate .js/.jsx files to delete.\n';
  }
} else {
  if (duplicatesToReport.length > 0) {
    output += '\n🔍 Duplicate component files found:\n\n';
    duplicatesToReport.forEach((fileGroup, index) => {
      output += `#${index + 1}: ${path.basename(fileGroup[0], path.extname(fileGroup[0]))}\n`;
      fileGroup.forEach(file => {
        output += `  - ${path.relative(path.join(rootDir, '..'), file)}\n`;
      });
      output += '\n';
    });
    output += `💡 Total sets of duplicates found: ${duplicatesToReport.length}\n`;
    output += '\nRun this script with the --delete flag to remove the redundant .js/.jsx files.\n';
  } else {
    output += '✅ No duplicates found.\n';
  }
}

console.log(output);
