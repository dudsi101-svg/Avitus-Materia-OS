import fs from 'node:fs';
import path from 'node:path';

const roots = ['modules'];
const violations = [];
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const moduleName of fs.readdirSync(root)) {
    const src = path.join(root, moduleName, 'src');
    if (!fs.existsSync(src)) continue;
    const stack = [src];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(full);
        if (!entry.isFile() || !/\.(ts|tsx)$/.test(entry.name)) continue;
        const text = fs.readFileSync(full, 'utf8');
        const pattern = /@avitus\/([a-z-]+)\/.*infrastructure/g;
        for (const match of text.matchAll(pattern)) {
          if (match[1] !== moduleName) violations.push(`${full}: ${match[0]}`);
        }
      }
    }
  }
}
if (violations.length) {
  console.error('Invalid cross-module infrastructure imports:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('Module boundary check passed.');
