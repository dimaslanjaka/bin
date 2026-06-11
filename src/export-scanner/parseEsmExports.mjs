import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default ?? traverseModule;

const BABEL_PLUGINS = [
  'typescript',
  'jsx',
  'decorators-legacy',
  'classProperties',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom'
];

/**
 * Parse exported symbols from an ESM file using Babel AST.
 * @param {string} code
 * @returns {import('./types').ExportEntry[]}
 */
export default function parseEsmExports(code) {
  const ast = parse(code, {
    sourceType: 'unambiguous',
    plugins: BABEL_PLUGINS
  });

  const exports = [];
  /** Set of local variable names imported from local (relative) paths */
  const localImportBindings = new Set();

  function addExport(item) {
    exports.push(item);
  }

  function getDeclarationType(node) {
    if (!node) return 'unknown';
    switch (node.type) {
      case 'FunctionDeclaration':
        return 'function';
      case 'ClassDeclaration':
        return 'class';
      case 'VariableDeclaration':
        return 'variable';
      case 'TSTypeAliasDeclaration':
        return 'type';
      case 'TSInterfaceDeclaration':
        return 'interface';
      case 'TSEnumDeclaration':
        return 'enum';
      default:
        return node.type;
    }
  }

  function getVariableNames(declaration) {
    const names = [];
    for (const decl of declaration.declarations ?? []) {
      if (decl.id?.type === 'Identifier') {
        names.push(decl.id.name);
      }
      if (decl.id?.type === 'ObjectPattern') {
        for (const prop of decl.id.properties) {
          if (prop.key?.type === 'Identifier') names.push(prop.key.name);
        }
      }
      if (decl.id?.type === 'ArrayPattern') {
        for (const el of decl.id.elements) {
          if (el?.type === 'Identifier') names.push(el.name);
        }
      }
    }
    return names;
  }

  traverse(ast, {
    // Track imports from local files to detect re-exports
    ImportDeclaration(p) {
      const source = p.node.source.value;
      if (source.startsWith('.')) {
        for (const spec of p.node.specifiers) {
          if (
            spec.type === 'ImportSpecifier' ||
            spec.type === 'ImportDefaultSpecifier' ||
            spec.type === 'ImportNamespaceSpecifier'
          ) {
            localImportBindings.add(spec.local.name);
          }
        }
      }
    },

    ExportNamedDeclaration(p) {
      const node = p.node;

      // export { foo, bar as baz } from "./x";
      if (node.specifiers?.length) {
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ExportSpecifier') {
            // Detect re-export: either explicit with `from`, or implicit where the
            // specifier's local name was imported from another local file
            const hasSource = !!node.source;
            const isLocalReExport = !hasSource && localImportBindings.has(specifier.local.name);
            addExport({
              name: specifier.exported.name ?? specifier.exported.value,
              type: 'specifier',
              exportType: hasSource || isLocalReExport ? 're-export' : 'named',
              source: node.source?.value ?? null
            });
          }
          if (specifier.type === 'ExportNamespaceSpecifier') {
            addExport({
              name: specifier.exported.name,
              type: 'namespace',
              exportType: 'namespace-re-export',
              source: node.source?.value ?? null
            });
          }
        }
      }

      const declaration = node.declaration;
      if (declaration) {
        const type = getDeclarationType(declaration);
        if (
          declaration.type === 'FunctionDeclaration' ||
          declaration.type === 'ClassDeclaration' ||
          declaration.type === 'TSTypeAliasDeclaration' ||
          declaration.type === 'TSInterfaceDeclaration' ||
          declaration.type === 'TSEnumDeclaration'
        ) {
          addExport({
            name: declaration.id?.name ?? 'anonymous',
            type,
            exportType: 'named',
            source: null
          });
        }
        if (declaration.type === 'VariableDeclaration') {
          for (const name of getVariableNames(declaration)) {
            addExport({ name, type: 'variable', exportType: 'named', source: null });
          }
        }
      }
    },

    ExportDefaultDeclaration(p) {
      const declaration = p.node.declaration;
      let type = getDeclarationType(declaration);
      let name = 'default';
      if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') {
        name = declaration.id?.name ?? 'default';
      }
      if (declaration.type === 'Identifier') {
        name = declaration.name;
        type = 'identifier';
      }
      addExport({ name, type, exportType: 'default', source: null });
    },

    ExportAllDeclaration(p) {
      addExport({
        name: '*',
        type: 'all',
        exportType: 're-export',
        source: p.node.source.value
      });
    }
  });

  return exports;
}
