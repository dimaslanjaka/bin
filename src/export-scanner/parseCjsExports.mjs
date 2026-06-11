const MODULE_EXPORTS_OBJ_RE = /module\.exports\s*=\s*\{([^}]+)\}/g;
const MODULE_EXPORTS_FN_RE = /module\.exports\s*=\s*(\w+)/g;
const EXPORTS_DOT_RE = /exports\.(\w+)\s*=/g;

/**
 * Parse exported symbols from a CJS file using regex.
 * @param {string} code
 * @returns {{ named: string[], default: string | null }}
 */
export default function parseCjsExports(code) {
  const named = new Set();
  let defaultExport = null;

  // module.exports = { foo, bar, baz: qux }
  let match;
  while ((match = MODULE_EXPORTS_OBJ_RE.exec(code)) !== null) {
    for (const part of match[1].trim().split(',')) {
      const key = part
        .trim()
        .split(':')[0]
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      if (key && key.length > 0 && key !== 'default') {
        named.add(key);
      }
    }
  }

  // module.exports = functionName  (single default export — NOT a named export)
  while ((match = MODULE_EXPORTS_FN_RE.exec(code)) !== null) {
    const name = match[1].trim();
    if (name !== 'exports' && name !== '{}' && !name.startsWith('{') && !name.startsWith('[') && name.length > 0) {
      defaultExport = name;
    }
  }

  // exports.foo = ... (always scan — works alongside module.exports = { ... })
  while ((match = EXPORTS_DOT_RE.exec(code)) !== null) {
    if (match[1] && match[1] !== 'default') {
      named.add(match[1]);
    }
  }

  return { named: [...named], default: defaultExport };
}
