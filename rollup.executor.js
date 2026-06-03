import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import fs from 'fs-extra';
import path from 'upath';

function stripWrappingQuotes(value) {
  return typeof value === 'string' ? value.replace(/^(["'])(.*)\1$/, '$2') : value;
}

const inputFile = path.resolve(stripWrappingQuotes(process.env.BUNDLE_INPUT) || 'src/index.ts');
const outputFile = path.toUnix(stripWrappingQuotes(process.env.BUNDLE_OUTPUT) || 'dist/bundle.cjs');
const isTypeScript = /\.(ts|tsx)$/.test(inputFile);

if (process.env.DEBUG === 'true') {
  console.log(`Rollup configuration:`);
  console.log(`  Input: ${inputFile}`);
  console.log(`  Output: ${outputFile}`);
  console.log(`  Is TypeScript: ${isTypeScript}`);
}

export default {
  input: inputFile,
  output: {
    file: outputFile,
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    alias({
      entries: [
        // Add custom aliases here if needed
      ]
    }),
    json(),
    resolve({ preferBuiltins: true, extensions: ['.js', '.mjs', '.cjs', '.ts', '.json', '.node'] }),
    ...(isTypeScript
      ? [
          typescript({
            tsconfig: false,
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            resolveJsonModule: true,
            moduleResolution: 'bundler',
            target: 'ES2019',
            module: 'ESNext',
            declaration: false,
            strict: false,
            noEmitOnError: false,
            noEmit: false,
            outDir: undefined,
            exclude: ['**/node_modules/**', '**/dist/**', '**/test/**', '**/tmp/**']
          })
        ]
      : []),
    commonjs({ extensions: ['.js', '.mjs', '.cjs', '.ts', '.json', '.node'] })
  ],
  // Mark all installed dependencies and devDependencies as external
  external: [
    ...(() => {
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
    })()
  ]
};
