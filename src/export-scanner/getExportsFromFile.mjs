import fs from 'fs-extra';
import path from 'upath';
import parseEsmExports from './parseEsmExports.mjs';
import parseCjsExports from './parseCjsExports.mjs';

function isCjsFile(file) {
  return path.extname(file) === '.cjs' || path.extname(file) === '.cts';
}

/**
 * Get exported symbols from a source file.
 * Uses AST for ESM, regex for CJS.
 * @param {string} filePath
 * @returns {{ symbols: string[], exports: import('./types').ExportEntry[], defaultExport: string | null }}
 */
export default function getExportsFromFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');

  if (isCjsFile(filePath)) {
    const parsed = parseCjsExports(code);
    const symbols = [...new Set([...parsed.named, ...(parsed.default ? [parsed.default] : [])])];
    return { symbols, exports: [], defaultExport: parsed.default };
  }

  // Try AST; fall back to CJS regex if parsing fails
  try {
    const exports = parseEsmExports(code);
    const symbols = [
      ...new Set(
        exports
          .filter((e) => (e.exportType === 'named' || e.exportType === 'default') && e.source === null)
          .map((e) => e.name)
          .filter((n) => n !== '*' && n !== 'default' && n !== 'anonymous')
      )
    ];
    return { symbols, exports, defaultExport: null };
  } catch {
    // If AST parsing fails (maybe a non-standard file), try CJS regex
    const parsed = parseCjsExports(code);
    const symbols = [...new Set([...parsed.named, ...(parsed.default ? [parsed.default] : [])])];
    return { symbols, exports: [], defaultExport: parsed.default };
  }
}
