import fs from 'fs-extra';

/**
 * Parse existing re-exports from the index file.
 * Returns a Map of source -> symbol names.
 * @param {string} indexPath - absolute path to the index file (e.g. src/index.ts)
 * @returns {Map<string, string[]>}
 */
export default function parseIndexExports(indexPath) {
  if (!fs.existsSync(indexPath)) return new Map();
  const content = fs.readFileSync(indexPath, 'utf-8');
  const results = new Map();

  // Named re-exports: export { a, b } from './path'
  const namedRe = /export\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]\s*;?/g;
  let match;
  while ((match = namedRe.exec(content)) !== null) {
    const source = match[2];
    const block = match[1];
    const symRe = /\b([a-zA-Z_$]\w*)\b/g;
    const symbols = [];
    let sm;
    while ((sm = symRe.exec(block)) !== null) {
      if (['type', 'as'].includes(sm[1]) && sm[1] === 'as') {
        // skip 'as' keyword
        continue;
      }
      if (sm[1] && !['export', 'from', 'type', 'as', 'default'].includes(sm[1])) {
        symbols.push(sm[1]);
      }
    }
    if (symbols.length) {
      results.set(source, [...(results.get(source) || []), ...symbols]);
    }
  }

  // Type re-exports: export type { a, b } from './path'
  const typeRe = /export\s+type\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]\s*;?/g;
  while ((match = typeRe.exec(content)) !== null) {
    const source = match[2];
    const symRe = /\b([a-zA-Z_$]\w*)\b/g;
    const symbols = [];
    let sm;
    while ((sm = symRe.exec(match[1])) !== null) {
      if (sm[1] && !['export', 'from', 'type', 'as', 'default'].includes(sm[1])) {
        symbols.push(sm[1]);
      }
    }
    if (symbols.length) {
      results.set(source, [...(results.get(source) || []), ...symbols]);
    }
  }

  // import + re-export pattern: import x from './x'; export { x as y }
  // This is harder to parse statically — we detect export { ... } statements
  // that reference imported names (already captured by the namedRe above).

  return results;
}
