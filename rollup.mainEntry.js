import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import fs from 'fs-extra';
import path from 'upath';
import { extractLocalFiles } from './src/utils/extract-local-files.js';

const input = path.resolve('src/index.ts');
const references = extractLocalFiles(input);

export default [
  {
    input: [input, ...Array.from(references)],
    output: [
      {
        // file: path.toUnix('lib/index.cjs'),
        dir: 'lib',
        format: 'cjs',
        sourcemap: false
      },
      {
        // file: path.toUnix('lib/index.mjs'),
        dir: 'lib',
        format: 'es',
        sourcemap: false
      }
    ],
    plugins: [
      alias({
        entries: []
      }),
      json(),
      resolve({ preferBuiltins: true, extensions: ['.js', '.mjs', '.cjs', '.ts', '.json', '.node'] }),
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
        exclude: ['**/node_modules/**', '**/dist/**', '**/test*/**', '**/tmp/**', '**/packages/**']
      }),
      commonjs({ extensions: ['.js', '.mjs', '.cjs', '.ts', '.json', '.node'] })
    ],
    external: [
      ...(() => {
        const pkgPath = path.join(process.cwd(), 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
      })()
    ]
  }
];
