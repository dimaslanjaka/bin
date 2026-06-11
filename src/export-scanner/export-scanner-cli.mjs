#!/usr/bin/env node

/**
 * Scan src/ for exported symbols and compare with index.ts re-exports.
 * Run with -h/--help for usage.
 */

import fs from 'fs-extra';
import { globSync } from 'glob';
import path from 'upath';
import { fileURLToPath } from 'url';
import { getArgs } from '../utils/index.cjs';
import { eslintFix } from '../utils/eslint-helper.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.toUnix(process.cwd());
const SRC = path.join(ROOT, 'src');
const DEFAULT_OUTPUT = path.join(SRC, 'index.ts');

import { DEFAULT_IGNORE_PATTERNS, shouldIgnore } from './filters.mjs';
import { resolveSourcePath } from './resolver.mjs';

import getExportsFromFile from './getExportsFromFile.mjs';
import parseIndexExports from './parseIndexExports.mjs';

// ─── CLI ──────────────────────────────────────────────────────

const parsedArgs = getArgs({
  boolean: ['write', 'help'],
  string: ['output', 'ignore'],
  alias: { o: 'output', w: 'write', i: 'ignore', h: 'help' }
});

if (parsedArgs.help) {
  console.log(`Usage: node ${__dirname} [options]

Scan src/ for exported symbols and compare with index.ts re-exports.

Options:
  -w, --write            Generate fresh exports file (overwrites output)
  -o, --output <file>    Write to custom file (default: src/index.ts)
  -i, --ignore <path>    Ignore a source file/dir (relative to src/). Repeatable.
                         When set, overrides all default ignores.
                         Directories: add trailing slash (e.g. "export-scanner/")
                         Files: exact relative path (e.g. "utils/extract-local-files.js")
                         Regex: wrap in /.../ (e.g. "/regex/")
  -h, --help             Show this help message

Examples:
  node ${__dirname}                          Dry-run: report missing exports
  node ${__dirname} -w                        Generate fresh exports file
  node ${__dirname} -w -o out.ts              Write to custom file
  node ${__dirname} -i utils/foo.js           Ignore a source file
  node ${__dirname} -i utils/a.js -i utils/b.js  Ignore multiple files`);
  process.exit(0);
}

const FLAG_WRITE = parsedArgs.write;
const OUTPUT_FILE = parsedArgs.output ? path.resolve(ROOT, parsedArgs.output) : DEFAULT_OUTPUT;

// Ignore patterns: use --ignore values when provided, otherwise built-in defaults
const ignorePatterns = parsedArgs.ignore
  ? (Array.isArray(parsedArgs.ignore) ? parsedArgs.ignore : [parsedArgs.ignore]).map((p) => p.replace(/^\.\//, ''))
  : DEFAULT_IGNORE_PATTERNS;

// ─── Main logic ───────────────────────────────────────────────

// 1. Scan src/
const sourceFiles = globSync('**/*.{ts,js,mjs,cjs,cts,tsx}', { cwd: SRC, nodir: true, dot: false })
  .map((f) => path.join(SRC, f))
  .filter((f) => !shouldIgnore(f, SRC, ignorePatterns))
  .filter((f) => path.basename(f) !== 'index.ts'); // skip entry point itself

const sourceExports = new Map(); // relativePath -> string[]
const defaultExports = new Map(); // relativePath -> string
for (const file of sourceFiles) {
  const { symbols, defaultExport } = getExportsFromFile(file);
  if (symbols.length > 0) {
    const relative = path.toUnix(path.relative(SRC, file));
    sourceExports.set(relative, symbols);
    if (defaultExport) {
      defaultExports.set(relative, defaultExport);
    }
  }
}

// 2. Parse index.ts
const indexExports = parseIndexExports(OUTPUT_FILE || DEFAULT_OUTPUT);

// 3. Build a reverse lookup: which source paths are used in index?

// Normalize a src-relative path to the form used in index.ts (./ prefix)
// Strips .ts extension per project convention (bundlers resolve .ts without extension)
function normalizeIndexPath(p) {
  const stripped = p.replace(/\.ts$/, '');
  return stripped.startsWith('./') ? stripped : './' + stripped;
}

// Look up an index entry, trying both stripped and .ts-suffixed variants for backward compat
function lookupIndexEntry(normalized) {
  return indexExports.get(normalized) || indexExports.get(normalized + '.ts') || [];
}

// 3b. Deduplicate: if a symbol appears in both a barrel (index.*) file and a definitive
// source file, prefer the definitive source. This avoids duplicate re-exports.
{
  const symbolToSource = new Map(); // symbol -> definitive source (non-barrel)
  const barrelEntries = [];

  for (const [srcFile, syms] of sourceExports) {
    const isBarrel = /\/(index|index\.\w+)$/.test(srcFile) || /^index\.\w+$/.test(srcFile);
    if (isBarrel) {
      barrelEntries.push(srcFile);
    } else {
      for (const sym of syms) {
        if (!symbolToSource.has(sym)) {
          symbolToSource.set(sym, srcFile);
        }
      }
    }
  }

  for (const barrelFile of barrelEntries) {
    const barrelSyms = sourceExports.get(barrelFile);
    if (!barrelSyms) continue;
    const uniqueSyms = barrelSyms.filter((sym) => {
      const definitive = symbolToSource.get(sym);
      return !definitive || definitive === barrelFile;
    });
    if (uniqueSyms.length === 0) {
      sourceExports.delete(barrelFile);
    } else if (uniqueSyms.length < barrelSyms.length) {
      sourceExports.set(barrelFile, uniqueSyms);
    }
  }
}

// 4. Compare
const missing = new Map(); // relativePath -> [missingSymbols]
const stale = []; // sources in index that no longer exist or have no exports

for (const [srcFile, syms] of sourceExports) {
  const normalized = normalizeIndexPath(srcFile);
  const indexed = lookupIndexEntry(normalized);
  const indexedSet = new Set(indexed);

  const missingSyms = syms.filter((s) => !indexedSet.has(s));
  if (missingSyms.length > 0) {
    missing.set(srcFile, missingSyms);
  }
}

// Detect stale re-exports: sources in index.ts that don't exist or have nothing to export
for (const [indexedSrc] of indexExports) {
  // Strip ./ prefix for comparison
  const rawSrc = indexedSrc.replace(/^\.\//, '');
  const actualPath = resolveSourcePath(rawSrc, SRC);
  if (!actualPath) {
    stale.push({ source: indexedSrc, reason: 'file not found' });
  } else {
    const { symbols } = getExportsFromFile(actualPath);
    const symsInIndex = indexExports.get(indexedSrc) || [];
    const staleSyms = symsInIndex.filter((s) => !symbols.includes(s));
    if (staleSyms.length > 0) {
      // Only auto-remove when ALL symbols from this source are stale
      if (staleSyms.length === symsInIndex.length) {
        stale.push({ source: indexedSrc, reason: `symbols no longer exported: ${staleSyms.join(', ')}` });
      } else {
        console.warn(
          `⚠️  Partial stale in ${indexedSrc}: ${staleSyms.join(', ')} (not auto-removed — some exports still valid)`
        );
      }
    }
  }
}

// ─── Output ───────────────────────────────────────────────────

const totalExports = [...sourceExports.values()].reduce((sum, arr) => sum + arr.length, 0);
const totalIndexed = [...indexExports.values()].reduce((sum, arr) => sum + arr.length, 0);

console.log(`\n📦 Export Scanner Report`);
console.log(`   Source files with exports: ${sourceExports.size}`);
console.log(`   Total exports found:       ${totalExports}`);
console.log(`   Index.ts export lines:     ${indexExports.size}`);
console.log(`   Index.ts symbols indexed:  ${totalIndexed}`);

if (missing.size === 0) {
  console.log(`\n✅ All source exports are already re-exported from index.ts!`);
} else {
  console.log(`\n❌ ${missing.size} files have missing exports in index.ts:\n`);
  for (const [srcFile, syms] of missing) {
    console.log(`   📄 ${srcFile}`);
    for (const s of syms) {
      console.log(`      - ${s}`);
    }
  }
}

if (stale.length > 0) {
  console.log(`\n⚠️  ${stale.length} stale entries in index.ts:\n`);
  for (const { source, reason } of stale) {
    console.log(`   📄 ${source} — ${reason}`);
  }
}

// ─── --write: generate fresh exports file ─────────────────────

if (FLAG_WRITE) {
  console.log(`\n📝 Generating fresh exports file at ${OUTPUT_FILE}...\n`);

  // Collect all source exports grouped by file, sorted by path
  const entries = [...sourceExports.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([srcFile, syms]) => {
      const normalized = normalizeIndexPath(srcFile);
      const defaultName = defaultExports.get(srcFile);
      const lines = [];

      // Default export: export { default as name } from './...'
      if (defaultName) {
        lines.push(`export { default as ${defaultName} } from '${normalized}';\n`);
      }

      // Named exports: export { a, b, c } from './...'
      const named = defaultName ? syms.filter((s) => s !== defaultName) : [...syms];
      if (named.length > 0) {
        const sortedSyms = named.sort();
        if (sortedSyms.length <= 4) {
          lines.push(`export { ${sortedSyms.join(', ')} } from '${normalized}';\n`);
        } else {
          lines.push(`export {\n  ${sortedSyms.join(',\n  ')}\n} from '${normalized}';\n`);
        }
      }

      return lines;
    });

  const header =
    `// ─── Auto-generated exports — do not edit manually ───\n` +
    `// Generated by export-scanner.mjs on ${new Date().toISOString().split('T')[0]}\n\n`;

  const content = header + entries.join('\n');

  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  console.log(`   ✅ Wrote ${entries.length} export line(s) to ${path.relative(ROOT, OUTPUT_FILE)}`);
  eslintFix(OUTPUT_FILE);
}

// ─── Auto-remove stale exports (always runs, skipped when --write regenerates the file) ─────

if (!FLAG_WRITE && stale.length > 0) {
  console.log(`\n🧹 Removing stale re-exports from ${path.relative(ROOT, OUTPUT_FILE)}...\n`);
  let content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
  let removedCount = 0;

  // Remove lines containing stale imports
  for (const { source } of stale) {
    const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lineRe = new RegExp(`^export\\s+(?:type\\s+)?\\{[^}]*\\}\\s+from\\s+['"]${escapedSource}['"];?\\s*$`, 'gm');
    const before = content;
    content = content.replace(lineRe, (_match) => {
      removedCount++;
      return ''; // remove the line
    });
    if (content === before) {
      // Try matching with the multi-line format
      const multiRe = new RegExp(`export\\s+(?:type\\s+)?\\{[^}]*\\}\\s*\\n?from\\s+['"]${escapedSource}['"];?`, 'g');
      content = content.replace(multiRe, (_match) => {
        removedCount++;
        return '';
      });
    }
  }

  // Clean up empty lines
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  console.log(`   ✅ Removed ${removedCount} stale export line(s)`);
  eslintFix(OUTPUT_FILE);
}

// ─── Show all exports ────────────────────────────────────────

console.log(`\n─── All exports found ───\n`);
for (const [srcFile, syms] of sourceExports) {
  const normalized = normalizeIndexPath(srcFile);
  const indexed = lookupIndexEntry(normalized);
  console.log(`   ${srcFile}`);
  for (const s of syms) {
    const isIndexed = indexed.includes(s) || [...indexExports.values()].some((arr) => arr.includes(s));
    console.log(`      ${isIndexed ? '✅' : '❌'} ${s}`);
  }
  console.log('');
}
