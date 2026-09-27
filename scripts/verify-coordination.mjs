// Guards shared sequential identifiers that parallel agents/branches can silently collide on.
// See docs/COORDINATION.md.
import fs from 'node:fs';
import path from 'node:path';

const violations = [];

// 1. Migrations: unique 4-digit prefix. The migrator applies files in lexical order and records
// them by filename, so two branches both adding `0004_*` would yield environment-dependent order.
const migrationDir = path.join('packages', 'database', 'migrations');
if (fs.existsSync(migrationDir)) {
  const byPrefix = new Map();
  for (const file of fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql'))) {
    const match = /^(\d{4})_[a-z0-9_]+\.sql$/.exec(file);
    if (!match) {
      violations.push(`${migrationDir}/${file}: expected NNNN_snake_case.sql`);
      continue;
    }
    byPrefix.set(match[1], [...(byPrefix.get(match[1]) ?? []), file]);
  }
  for (const [prefix, files] of byPrefix) {
    if (files.length > 1) violations.push(`Duplicate migration number ${prefix}: ${files.join(', ')}`);
  }
}

// 2. Decision records: unique DD-NNN headings.
const decisionsFile = path.join('docs', 'DECISIONS.md');
if (fs.existsSync(decisionsFile)) {
  const seen = new Map();
  for (const match of fs.readFileSync(decisionsFile, 'utf8').matchAll(/^## (DD-\d{3})\b.*$/gm)) {
    seen.set(match[1], [...(seen.get(match[1]) ?? []), match[0].slice(3)]);
  }
  for (const [id, headings] of seen) {
    if (headings.length > 1) violations.push(`Duplicate decision ${id}: ${headings.join(' | ')}`);
  }
}

if (violations.length) {
  console.error(
    'Coordination check failed (see docs/COORDINATION.md, reserve IDs in docs/WORK_BOARD.md):\n' +
      violations.join('\n'),
  );
  process.exit(1);
}
console.log('Coordination check passed.');
