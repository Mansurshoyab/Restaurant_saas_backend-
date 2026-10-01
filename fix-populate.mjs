import fs from 'fs';
import path from 'path';

function getFiles(dir) {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  });
  return Array.prototype.concat(...files);
}

const files = getFiles('./src/modules').filter(f => f.endsWith('.service.js'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Regex to match .populate('path', 'select')
  const regex2 = /\.populate\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, `.populate({ path: '$1', select: '$2', options: { tenant } })`);
    changed = true;
  }

  // Regex to match .populate('path')
  const regex1 = /\.populate\(\s*'([^']+)'\s*\)/g;
  if (regex1.test(content)) {
    content = content.replace(regex1, `.populate({ path: '$1', options: { tenant } })`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
