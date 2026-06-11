import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import fs from 'fs-extra';
import path from 'upath';

const traverse = traverseModule.default ?? traverseModule;

/**
 * Resolve a relative import path to an absolute file path.
 * Checks the path as-is first, then tries appending known extensions.
 * @param {string} importPath - Relative import path (e.g. './foo' or './foo.cjs')
 * @param {string} baseDir - Absolute directory to resolve against
 * @returns {string|null} Resolved absolute file path, or null if not found
 */
export function resolveLocalFile(importPath, baseDir) {
  const resolvedPath = path.resolve(baseDir, importPath);

  // Check the path as-is first (handles files with explicit extensions like .cjs, .mjs)
  if (fs.existsSync(resolvedPath)) return resolvedPath;

  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '/index.ts', '/index.js'];
  for (const ext of extensions) {
    const fullPath = resolvedPath + ext;
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

/**
 * Recursively collect all local file dependencies from a source file.
 * Handles import declarations, require() calls, and re-exports (export ... from).
 * @param {string} filePath - Absolute path to the entry source file
 * @param {Set<string>} [collected] - Internal set used during recursion
 * @returns {Set<string>} Set of absolute paths to local files
 */
export function extractLocalFiles(filePath, collected = new Set()) {
  const code = fs.readFileSync(filePath, 'utf8');
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });

  const dir = path.dirname(filePath);

  traverse(ast, {
    ImportDeclaration({ node }) {
      const imported = node.source.value;
      if (imported.startsWith('.')) {
        const resolved = resolveLocalFile(imported, dir);
        if (resolved && !collected.has(resolved)) {
          collected.add(resolved);
          extractLocalFiles(resolved, collected);
        }
      }
    },
    CallExpression({ node }) {
      if (node.callee.name === 'require' && node.arguments.length === 1 && node.arguments[0].type === 'StringLiteral') {
        const imported = node.arguments[0].value;
        if (imported.startsWith('.')) {
          const resolved = resolveLocalFile(imported, dir);
          if (resolved && !collected.has(resolved)) {
            collected.add(resolved);
            extractLocalFiles(resolved, collected);
          }
        }
      }
    },
    ExportNamedDeclaration({ node }) {
      if (node.source && node.source.value.startsWith('.')) {
        const resolved = resolveLocalFile(node.source.value, dir);
        if (resolved && !collected.has(resolved)) {
          collected.add(resolved);
          extractLocalFiles(resolved, collected);
        }
      }
    },
    ExportAllDeclaration({ node }) {
      if (node.source.value.startsWith('.')) {
        const resolved = resolveLocalFile(node.source.value, dir);
        if (resolved && !collected.has(resolved)) {
          collected.add(resolved);
          extractLocalFiles(resolved, collected);
        }
      }
    }
  });

  return collected;
}
